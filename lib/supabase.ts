import { createBrowserClient, createServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// ── Client component singleton ─────────────────────────────────────────────
export function getBrowserClient() {
  if (!URL || !ANON) return null;
  return createBrowserClient(URL, ANON);
}

// ── Server / Route handler client — uses modern getAll/setAll cookie API ───
export function getServerClient(cookieStore: {
  getAll(): { name: string; value: string }[];
  set(name: string, value: string, options?: Record<string, unknown>): void;
}) {
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          try { cookieStore.set(name, value, options as Record<string, unknown>); } catch {}
        });
      },
    },
  });
}

// ── Service-role client (server-side trusted operations only) ──────────────
export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL || !serviceKey) {
    throw new Error("Supabase service role env vars not configured");
  }
  return createClient(URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type Profile = {
  id: string;
  email: string;
  created_at: string;
  plan: "free" | "once" | "monthly";
  analyses_limit: number;
  analyses_used: number;
};
