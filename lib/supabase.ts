import { createBrowserClient, createServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

// Strip any accidental trailing path (e.g. /rest/v1) from the project URL.
// NEXT_PUBLIC_SUPABASE_URL must be https://<project>.supabase.co with nothing after.
function sanitizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}`;
  } catch {
    return raw;
  }
}

const SUPABASE_URL  = sanitizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "");
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// ── Client component singleton ─────────────────────────────────────────────
export function getBrowserClient() {
  // Diagnostic: logs first 10 chars so you can verify env vars are loaded
  if (typeof window !== "undefined") {
    console.log(
      "[Supabase] URL:", SUPABASE_URL.substring(0, 10) || "(empty!)",
      "| ANON:", SUPABASE_ANON.substring(0, 10) || "(empty!)"
    );
  }
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;
  // Only add apikey in global headers — never override Authorization,
  // which must be managed dynamically by the client's own fetch wrapper
  // so it can swap anon key → user JWT after login.
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { apikey: SUPABASE_ANON } },
  });
}

// ── Server / Route handler client — modern getAll/setAll cookie API ────────
export function getServerClient(cookieStore: {
  getAll(): { name: string; value: string }[];
  set(name: string, value: string, options?: Record<string, unknown>): void;
}) {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    throw new Error(
      `Supabase env vars missing on server. ` +
      `URL: "${SUPABASE_URL.substring(0, 10)}" ANON: "${SUPABASE_ANON.substring(0, 10)}"`
    );
  }
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          try { cookieStore.set(name, value, options as Record<string, unknown>); } catch {}
        });
      },
    },
    global: { headers: { apikey: SUPABASE_ANON } },
  });
}

// ── Service-role client (server-side trusted operations only) ──────────────
export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !serviceKey) {
    throw new Error(
      `Supabase service role env vars missing. ` +
      `URL: "${SUPABASE_URL.substring(0, 10)}" KEY: "${(serviceKey ?? "").substring(0, 10)}"`
    );
  }
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { apikey: serviceKey } },
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
