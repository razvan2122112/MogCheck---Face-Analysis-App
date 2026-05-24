import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  // Skip session refresh if Supabase isn't configured
  if (!supabaseUrl || !supabaseAnon) return res;

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
      global: {
        headers: {
          apikey: supabaseAnon,
          Authorization: `Bearer ${supabaseAnon}`,
        },
      },
    });

    // Refresh session without making a network request (reads from cookies only)
    await supabase.auth.getSession();
  } catch {
    // Never block a request due to auth errors
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
