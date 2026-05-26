import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerClient, getServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { stripe_session_id } = (await req.json()) as { stripe_session_id?: string };
  if (!stripe_session_id) {
    return NextResponse.json({ ok: false, reason: "missing stripe_session_id" }, { status: 400 });
  }

  // Verify caller is authenticated and owns this purchase
  let userId: string | null = null;
  try {
    const cookieStore = await cookies();
    const supabase = getServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();
    userId = session?.user?.id ?? null;
  } catch { /* Supabase not configured */ }

  if (!userId) {
    return NextResponse.json({ ok: false, reason: "not_authenticated" }, { status: 401 });
  }

  try {
    const db = getServiceClient();
    await db
      .from("purchases")
      .update({ used: true })
      .eq("stripe_session_id", stripe_session_id)
      .eq("user_id", userId); // only mark purchases owned by this user
    console.log("[mark-used] marked used for session:", stripe_session_id, "user:", userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mark-used] error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
