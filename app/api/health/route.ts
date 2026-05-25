import { NextResponse } from "next/server";

export async function GET() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const fal  = process.env.FAL_KEY ?? "";
  const stripe = process.env.STRIPE_SECRET_KEY ?? "";

  return NextResponse.json({
    supabase_url:  url  ? `${url.substring(0, 20)}...`  : "MISSING",
    supabase_anon: anon ? `${anon.substring(0, 10)}...` : "MISSING",
    supabase_svc:  svc  ? `${svc.substring(0, 10)}...`  : "MISSING",
    fal_key:       fal  ? `${fal.substring(0, 8)}...`   : "MISSING",
    stripe_key:    stripe ? `${stripe.substring(0, 10)}...` : "MISSING",
  });
}
