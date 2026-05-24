import { createBrowserClient, createServerClient } from "@supabase/auth-helpers-nextjs";
import type { CookieOptions } from "@supabase/auth-helpers-nextjs";

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// ── Client component singleton ─────────────────────────────────────────────
export function getBrowserClient() {
  if (!URL || !ANON) return null;
  return createBrowserClient(URL, ANON);
}

// ── Server / Route handler client (pass Next.js cookies()) ─────────────────
export function getServerClient(cookieStore: {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options: CookieOptions): void;
  remove(name: string, options: CookieOptions): void;
}) {
  return createServerClient(URL, ANON, {
    cookies: {
      get:    (name) => cookieStore.get(name)?.value,
      set:    (name, value, opts) => { try { cookieStore.set(name, value, opts); } catch {} },
      remove: (name, opts)        => { try { cookieStore.remove(name, opts);     } catch {} },
    },
  });
}

// ── Service-role client (only for server-side trusted operations) ──────────
export function getServiceClient() {
  return createBrowserClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export type Profile = {
  id: string;
  email: string;
  created_at: string;
  plan: "free" | "once" | "monthly";
  analyses_limit: number;
  analyses_used: number;
};
