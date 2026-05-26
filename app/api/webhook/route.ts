import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";

  const stripe = new Stripe(secretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId        = session.client_reference_id ?? null;
    const customerEmail = (session.customer_details?.email ?? session.customer_email) ?? null;
    const analysisId    = session.metadata?.analysis_id ?? null;
    const amount        = session.amount_total ?? 0;

    // Determine plan from price_id (reliable) with metadata fallback
    let plan: "once" | "monthly" = (session.metadata?.plan ?? "once") as "once" | "monthly";
    try {
      const priceOnce    = process.env.STRIPE_PRICE_ONCE;
      const priceMonthly = process.env.STRIPE_PRICE_MONTHLY;
      if (priceOnce || priceMonthly) {
        const full = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["line_items"],
        });
        const priceId = full.line_items?.data[0]?.price?.id ?? null;
        console.log("[webhook] price_id from line_items:", priceId, "once:", priceOnce, "monthly:", priceMonthly);
        if (priceId && priceId === priceOnce) {
          plan = "once";
        } else if (priceId && priceId === priceMonthly) {
          plan = "monthly";
        }
      }
    } catch (err) {
      console.warn("[webhook] could not expand line_items, using metadata.plan:", plan, err);
    }

    console.log("[webhook] checkout.session.completed:", {
      sessionId: session.id, userId, customerEmail, plan, analysisId,
    });

    try {
      const supabase = getServiceClient();

      // Resolve user ID: prefer client_reference_id, fall back to email lookup
      let resolvedUserId = userId;
      if (!resolvedUserId && customerEmail) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", customerEmail)
          .maybeSingle();
        resolvedUserId = prof?.id ?? null;
        console.log("[webhook] email lookup:", customerEmail, "→ resolvedUserId:", resolvedUserId);
      }

      await supabase.from("purchases").upsert({
        user_id:           resolvedUserId,
        stripe_session_id: session.id,
        analysis_id:       analysisId,
        plan,
        amount,
        used:              false,
      }, { onConflict: "stripe_session_id" });

      if (resolvedUserId) {
        if (plan === "monthly") {
          const { error } = await supabase.from("profiles").update({
            plan:               "monthly",
            analyses_remaining: 999,
          }).eq("id", resolvedUserId);
          console.log("[webhook] profile updated → monthly, userId:", resolvedUserId, error ? "error:" + error.message : "ok");
        } else {
          const { error } = await supabase.from("profiles").update({
            plan:               "once",
            analyses_remaining: 1,
          }).eq("id", resolvedUserId);
          console.log("[webhook] profile updated → once, userId:", resolvedUserId, error ? "error:" + error.message : "ok");
        }
      } else {
        console.warn("[webhook] no user found for email:", customerEmail, "— profile not updated");
      }
    } catch (err) {
      console.error("Webhook DB error (tables may not be set up yet):", err);
      // Still return 200 so Stripe doesn't retry
    }
  }

  return NextResponse.json({ received: true });
}
