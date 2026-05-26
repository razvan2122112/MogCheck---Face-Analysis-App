"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase";

export default function SignupPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [sent, setSent]         = useState(false);
  const [redirect, setRedirect] = useState("/upload");
  const router = useRouter();
  const supabase = getBrowserClient();

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("redirect");
    if (r) setRedirect(r);
  }, []);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env vars.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signUp({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!supabase) {
      setError("Supabase is not configured. Check env vars.");
      return;
    }
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${redirect}` },
    });
  };

  if (sent) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-4xl">📬</div>
        <h1 className="text-2xl font-black text-center">Vérifie ton email</h1>
        <p className="text-sm text-white/50 text-center max-w-xs">
          Un lien de confirmation a été envoyé à <span className="text-white/80">{email}</span>.
          Clique dessus pour activer ton compte.
        </p>
        <Link href="/" className="text-xs text-[#e99846] hover:text-[#f0b060] transition-colors mt-4">
          Retour à l&apos;accueil
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="text-xl font-bold tracking-widest gold-text">MOGRANK</Link>
      </nav>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-[#e99846] mb-2 font-semibold">Nouveau compte</p>
            <h1 className="text-3xl font-black">Inscription</h1>
            <p className="text-sm text-white/40 mt-2">Crée ton compte MogRank</p>
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-full border border-white/15 text-sm font-semibold text-white/80 hover:border-white/30 hover:text-white transition-all mb-5 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30">ou</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleEmail} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-2xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#e99846]/50 transition-colors"
            />
            <input
              type="password"
              placeholder="Mot de passe (min. 6 caractères)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-2xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#e99846]/50 transition-colors"
            />
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full font-bold text-sm bg-[#e99846] text-[#0a0a0a] hover:bg-[#f0b060] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
            >
              {loading && <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />}
              Créer mon compte
            </button>
          </form>

          <p className="text-center text-xs text-white/30 mt-6">
            Déjà un compte ?{" "}
            <Link href="/auth/login" className="text-[#e99846] hover:text-[#f0b060] transition-colors">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
