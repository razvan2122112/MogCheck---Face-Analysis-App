import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ paid: false });
  }

  try {
    const sessionId = req.nextUrl.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ paid: false });
    }

    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid =
      session.payment_status === "paid" || session.status === "complete";

    return NextResponse.json({ paid });
  } catch (err) {
    console.error("/api/verify-payment error:", err);
    return NextResponse.json({ paid: false });
  }
}
