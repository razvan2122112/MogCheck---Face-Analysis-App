import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerClient } from "@/lib/supabase";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Stripe is not configured on this server." }, { status: 503 });
  }

  const prices: Record<string, string> = {
    once:    process.env.STRIPE_PRICE_ONCE    ?? "",
    monthly: process.env.STRIPE_PRICE_MONTHLY ?? "",
  };

  try {
    const { plan, analysis_id } = (await req.json()) as {
      plan: "once" | "monthly";
      analysis_id?: string;
    };

    if (!prices[plan]) {
      return NextResponse.json({ error: "Invalid plan or missing Stripe price configuration." }, { status: 400 });
    }

    // Get authenticated user (optional — anonymous checkout still works)
    const cookieStore = await cookies();
    const supabase = getServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;

    const stripe = new Stripe(secretKey);
    const stripeSession = await stripe.checkout.sessions.create({
      mode: plan === "monthly" ? "subscription" : "payment",
      line_items: [{ price: prices[plan], quantity: 1 }],
      success_url: `${APP_URL}/results?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${APP_URL}/results`,
      ...(userId && { client_reference_id: userId }),
      metadata: {
        plan,
        ...(analysis_id && { analysis_id }),
      },
    });

    return NextResponse.json({ url: stripeSession.url });
  } catch (err) {
    console.error("/api/checkout error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
