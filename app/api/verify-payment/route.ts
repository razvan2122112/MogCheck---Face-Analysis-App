import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceClient, getServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const sessionId = req.nextUrl.searchParams.get("session_id");

  // ── No session_id: check & decrement analyses_remaining from profile ──────
  if (!sessionId) {
    try {
      const cookieStore = await cookies();
      const supabase = getServerClient(cookieStore);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        return NextResponse.json({ paid: false, reason: "not_authenticated" });
      }

      const db = getServiceClient();
      const { data: profile } = await db
        .from("profiles")
        .select("plan, analyses_remaining")
        .eq("id", userId)
        .single();

      if (!profile) {
        return NextResponse.json({ paid: false, reason: "no_profile" });
      }

      if (profile.plan === "monthly") {
        return NextResponse.json({ paid: true });
      }

      const remaining = (profile.analyses_remaining ?? 0) as number;
      if (remaining > 0) {
        await db
          .from("profiles")
          .update({ analyses_remaining: remaining - 1 })
          .eq("id", userId);
        return NextResponse.json({ paid: true });
      }

      return NextResponse.json({ paid: false });
    } catch (err) {
      console.error("[verify-payment] analyses_remaining check error:", err);
      return NextResponse.json({ paid: false, reason: "error" });
    }
  }

  // ── With session_id: verify via Stripe (for redirect back from checkout) ──
  console.log("[verify-payment] received session_id:", sessionId);

  if (!secretKey) {
    console.warn("[verify-payment] STRIPE_SECRET_KEY not set — returning paid:false");
    return NextResponse.json({ paid: false, reason: "stripe_not_configured" });
  }

  try {
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log("[verify-payment] Stripe session:", {
      id:             session.id,
      status:         session.status,
      payment_status: session.payment_status,
    });

    const paid =
      session.payment_status === "paid" || session.status === "complete";

    return NextResponse.json({ paid });
  } catch (err) {
    console.error("[verify-payment] error:", err);
    return NextResponse.json({ paid: false, reason: "error" });
  }
}
