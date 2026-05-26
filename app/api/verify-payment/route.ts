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
      customer_email: session.customer_email,
      metadata:       session.metadata,
      amount_total:   session.amount_total,
    });

    const paidByStripe =
      session.payment_status === "paid" || session.status === "complete";

    // Belt-and-suspenders: also check purchases table in Supabase
    let paidBySupabase = false;
    try {
      const db = getServiceClient();
      const { data, error } = await db
        .from("purchases")
        .select("id, plan, analysis_id")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();
      console.log("[verify-payment] Supabase purchases lookup:", { data, error: error?.message });
      paidBySupabase = !!data;
    } catch (dbErr) {
      console.warn("[verify-payment] Supabase lookup failed (non-fatal):", dbErr);
    }

    const paid = paidByStripe || paidBySupabase;
    console.log("[verify-payment] final result:", { paid, paidByStripe, paidBySupabase });

    return NextResponse.json({ paid });
  } catch (err) {
    console.error("[verify-payment] error:", err);
    return NextResponse.json({ paid: false, reason: "error" });
  }
}
