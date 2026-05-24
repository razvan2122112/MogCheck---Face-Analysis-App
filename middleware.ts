import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import type { CookieOptions } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get:    (name) => req.cookies.get(name)?.value,
        set:    (name, value, opts: CookieOptions) => {
          req.cookies.set({ name, value, ...opts });
          res.cookies.set({ name, value, ...opts });
        },
        remove: (name, opts: CookieOptions) => {
          req.cookies.set({ name, value: "", ...opts });
          res.cookies.set({ name, value: "", ...opts });
        },
      },
    }
  );

  // Refresh session so it doesn't expire mid-visit
  await supabase.auth.getSession();

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
