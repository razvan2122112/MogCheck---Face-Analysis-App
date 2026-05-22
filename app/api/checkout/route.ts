import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Stripe is not configured on this server." },
      { status: 503 }
    );
  }

  const prices: Record<string, string> = {
    once: process.env.STRIPE_PRICE_ONCE ?? "",
    monthly: process.env.STRIPE_PRICE_MONTHLY ?? "",
  };

  try {
    const { plan } = (await req.json()) as { plan: "once" | "monthly" };

    if (!prices[plan]) {
      return NextResponse.json(
        { error: "Invalid plan or missing Stripe price configuration." },
        { status: 400 }
      );
    }

    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.create({
      mode: plan === "monthly" ? "subscription" : "payment",
      line_items: [{ price: prices[plan], quantity: 1 }],
      success_url: `${APP_URL}/results?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/results`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("/api/checkout error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
