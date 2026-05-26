import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const sessionId = req.nextUrl.searchParams.get("session_id");

  console.log("[verify-payment] received session_id:", sessionId ?? "(none)");

  if (!secretKey) {
    console.warn("[verify-payment] STRIPE_SECRET_KEY not set — returning paid:false");
    return NextResponse.json({ paid: false, reason: "stripe_not_configured" });
  }
  if (!sessionId) {
    console.warn("[verify-payment] no session_id in request");
    return NextResponse.json({ paid: false, reason: "no_session_id" });
  }

  try {
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log("[verify-payment] Stripe session:", {
      id:             session.id,
      status:         session.status,
      payment_status: session.payment_status,
      metadata:       session.metadata,
    });

    const paidByStripe =
      session.payment_status === "paid" || session.status === "complete";

    // Check purchases table to enforce the used flag
    try {
      const db = getServiceClient();
      const { data: purchase, error } = await db
        .from("purchases")
        .select("id, plan, used")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();

      console.log("[verify-payment] purchases lookup:", { purchase, error: error?.message });

      if (purchase) {
        if (purchase.plan === "once") {
          // One-time payment: deny if already consumed
          const paid = !purchase.used;
          console.log("[verify-payment] once plan — used:", purchase.used, "→ paid:", paid);
          return NextResponse.json({ paid });
        }
        // monthly plan: always valid while subscription active
        console.log("[verify-payment] monthly plan → paid: true");
        return NextResponse.json({ paid: true });
      }

      // Purchase row not yet written (webhook pending) — trust Stripe
      console.log("[verify-payment] no purchase row yet, trusting Stripe:", paidByStripe);
      return NextResponse.json({ paid: paidByStripe });
    } catch (dbErr) {
      console.warn("[verify-payment] Supabase lookup failed — falling back to Stripe:", dbErr);
      return NextResponse.json({ paid: paidByStripe });
    }
  } catch (err) {
    console.error("[verify-payment] error:", err);
    return NextResponse.json({ paid: false, reason: "error" });
  }
}
