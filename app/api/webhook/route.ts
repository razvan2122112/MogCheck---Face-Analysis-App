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

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(secretKey);
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId      = session.client_reference_id ?? null;
    const plan        = (session.metadata?.plan ?? "once") as "once" | "monthly";
    const analysisId  = session.metadata?.analysis_id ?? null;
    const amount      = session.amount_total ?? 0;

    try {
      const supabase = getServiceClient();

      await supabase.from("purchases").upsert({
        user_id:           userId,
        stripe_session_id: session.id,
        analysis_id:       analysisId,
        plan,
        amount,
      }, { onConflict: "stripe_session_id" });

      if (userId) {
        if (plan === "monthly") {
          await supabase.from("profiles").update({
            plan:           "monthly",
            analyses_limit: 9999,
          }).eq("id", userId);
        } else {
          const { data: prof } = await supabase
            .from("profiles").select("plan, analyses_limit").eq("id", userId).single();
          const currentPlan  = (prof?.plan ?? "free") as string;
          const currentLimit = (prof?.analyses_limit ?? 0) as number;
          await supabase.from("profiles").update({
            plan:           currentPlan === "monthly" ? "monthly" : "once",
            analyses_limit: currentLimit + 1,
          }).eq("id", userId);
        }
      }
    } catch (err) {
      console.error("Webhook DB error (tables may not be set up yet):", err);
      // Still return 200 so Stripe doesn't retry
    }
  }

  return NextResponse.json({ received: true });
}
