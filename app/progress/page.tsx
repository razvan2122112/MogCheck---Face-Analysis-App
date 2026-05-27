"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from "recharts";
import { getBrowserClient } from "@/lib/supabase";
import { useAuth } from "../context/auth";

interface Analysis {
  id: string;
  score: number | null;
  results: Record<string, unknown> | null;
  photo_url: string | null;
  created_at: string;
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function fmtFull(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" });
}

// ─── mock chart shown behind the locked overlay ───────────────────────────────

function MockChart() {
  return (
    <svg viewBox="0 0 300 120" className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="mockGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e99846" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#e99846" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,92 L40,82 L80,87 L120,68 L160,54 L200,40 L240,28 L300,16 L300,120 L0,120Z"
        fill="url(#mockGrad)"
      />
      <path
        d="M0,92 L40,82 L80,87 L120,68 L160,54 L200,40 L240,28 L300,16"
        stroke="#e99846"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {([[0,92],[80,87],[160,54],[240,28],[300,16]] as [number,number][]).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="#e99846" />
      ))}
      {/* Fake grid */}
      {[30, 60, 90].map(y => (
        <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
      ))}
    </svg>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const { user, authLoading, signOut } = useAuth();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  useEffect(() => {
    if (!user) { setDataLoading(false); return; }
    const supabase = getBrowserClient();
    if (!supabase) { setDataLoading(false); return; }
    (async () => {
      try {
        const { data } = await supabase
          .from("analyses")
          .select("id, score, results, photo_url, created_at")
          .eq("user_id", user.id)
          .not("score", "is", null)
          .order("created_at", { ascending: true });
        setAnalyses(data ?? []);
      } catch { /* ignore */ } finally {
        setDataLoading(false);
      }
    })();
  }, [user]);

  // ── shared nav ─────────────────────────────────────────────────────────────

  const navEl = (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-none">
      <Link href="/" className="text-xl font-bold tracking-widest gold-text">MOGRANK</Link>
      <div className="flex items-center gap-3">
        <Link href="/upload" className="text-xs text-white/40 hover:text-white/70 transition-colors hidden sm:block">
          Analyse
        </Link>
        {!authLoading && user ? (
          <>
            <span className="text-xs text-white/40 hidden sm:block" style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </span>
            <button onClick={handleSignOut} className="text-xs text-white/50 hover:text-white transition-colors">
              Déconnexion
            </button>
          </>
        ) : (
          <Link href="/auth/login" className="text-xs text-white/50 hover:text-white transition-colors">
            Se connecter
          </Link>
        )}
      </div>
    </nav>
  );

  // ── loading ────────────────────────────────────────────────────────────────

  if (authLoading || dataLoading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col">
        {navEl}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#e99846] border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  // ── locked preview (not logged in) ─────────────────────────────────────────

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col">
        {navEl}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          {/* Blurred chart preview */}
          <div className="w-full max-w-sm mb-7">
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden" style={{ height: 180 }}>
              <div className="absolute inset-0 opacity-25">
                <MockChart />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 backdrop-blur-sm bg-black/50">
                <span className="text-3xl">🔒</span>
                <p className="text-xs font-semibold text-white/50">Progression verrouillée</p>
              </div>
            </div>
          </div>

          {/* Blurred stat chips */}
          <div className="flex gap-3 mb-8 w-full max-w-sm">
            {["Score actuel", "1er score", "Jours"].map(label => (
              <div key={label} className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
                <div className="text-[9px] font-mono text-white/25 uppercase tracking-wider mb-1">{label}</div>
                <div className="text-2xl font-black text-white/10 blur-sm select-none">7.8</div>
              </div>
            ))}
          </div>

          <div className="text-center mb-8 max-w-xs">
            <p className="text-xs uppercase tracking-[0.3em] text-[#e99846] mb-3 font-semibold">Progression 90 jours</p>
            <h1 className="text-3xl font-black mb-3 leading-tight">
              Suis ta<br /><span className="text-[#e99846]">transformation</span>
            </h1>
            <p className="text-white/40 text-sm leading-relaxed">
              Crée ton compte gratuit pour tracker ta progression et valider les résultats du programme sur 90 jours.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Link
              href="/auth/signup"
              className="w-full py-4 rounded-full font-bold text-sm bg-[#e99846] text-[#0a0a0a] hover:bg-[#f0b060] hover:scale-[1.02] transition-all text-center shadow-lg shadow-[#e99846]/15"
            >
              Crée ton compte gratuit pour tracker ta progression →
            </Link>
            <Link
              href="/auth/login"
              className="w-full py-3.5 rounded-full font-bold text-sm border border-white/15 text-white/60 hover:border-white/30 hover:text-white transition-all text-center"
            >
              J'ai déjà un compte
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── empty state ────────────────────────────────────────────────────────────

  if (analyses.length === 0) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col">
        {navEl}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="text-6xl mb-5">📈</div>
          <h1 className="text-2xl font-black mb-3">Aucune analyse enregistrée</h1>
          <p className="text-white/40 text-sm mb-8 max-w-xs leading-relaxed">
            Fais ta première analyse pour commencer à tracker ta progression sur 90 jours.
          </p>
          <Link
            href="/upload"
            className="px-10 py-4 rounded-full font-bold text-sm bg-[#e99846] text-[#0a0a0a] hover:bg-[#f0b060] hover:scale-105 transition-all shadow-lg shadow-[#e99846]/15"
          >
            Faire ma première analyse →
          </Link>
        </div>
      </main>
    );
  }

  // ── compute stats ──────────────────────────────────────────────────────────

  const first = analyses[0];
  const latest = analyses[analyses.length - 1];
  const delta = Number((latest.score! - first.score!).toFixed(1));
  const daysSince = Math.max(
    0,
    Math.floor((Date.now() - new Date(first.created_at).getTime()) / (1000 * 60 * 60 * 24))
  );
  const daysToNext = Math.max(
    1,
    7 - Math.floor((Date.now() - new Date(latest.created_at).getTime()) / (1000 * 60 * 60 * 24))
  );

  const chartData = analyses.map(a => ({
    date: fmtDate(a.created_at),
    score: Number(a.score!.toFixed(1)),
  }));

  const needsMore = analyses.length < 3;
  const isImproving = !needsMore && delta >= 0.3;
  const isStagnating = !needsMore && delta < 0.3;

  // Newest-first for history display
  const history = [...analyses].reverse();

  // ── full progress view ─────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col">
      {navEl}

      <div className="flex-1 px-5 py-8 w-full max-w-xl mx-auto">

        {/* ── header ─────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#e99846] mb-2 font-semibold">Suivi · 90 jours</p>
          <h1 className="text-2xl sm:text-3xl font-black mb-5">Ta Progression MogRank</h1>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
              <div className="text-[9px] font-mono text-white/30 uppercase tracking-wider mb-1">Score actuel</div>
              <div className="text-2xl font-black text-[#e99846]">{latest.score!.toFixed(1)}</div>
              <div className="text-[9px] text-white/20">/10</div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
              <div className="text-[9px] font-mono text-white/30 uppercase tracking-wider mb-1">1er score</div>
              <div className="text-2xl font-black text-white/50">{first.score!.toFixed(1)}</div>
              <div className="text-[9px] text-white/20">/10</div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
              <div className="text-[9px] font-mono text-white/30 uppercase tracking-wider mb-1">En cours</div>
              <div className="text-2xl font-black text-white/50">{daysSince}</div>
              <div className="text-[9px] text-white/20">jours</div>
            </div>
          </div>

          {/* Delta pill */}
          <div
            className={`flex items-center gap-2 justify-center py-2.5 rounded-xl border ${
              delta > 0
                ? "border-[#e99846]/25 bg-[#e99846]/[0.05]"
                : delta < 0
                ? "border-red-500/25 bg-red-500/[0.04]"
                : "border-white/[0.06] bg-white/[0.02]"
            }`}
          >
            <span
              className={`text-lg font-black ${
                delta > 0 ? "text-[#e99846]" : delta < 0 ? "text-red-400" : "text-white/40"
              }`}
            >
              {delta > 0 ? "+" : ""}{delta} pts
            </span>
            <span className="text-xs text-white/35">depuis le début</span>
          </div>
        </div>

        {/* ── chart ──────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-4">Score sur le temps</h2>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#111111",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    color: "#ededed",
                    fontSize: 12,
                    padding: "6px 10px",
                  }}
                  formatter={(value) => [`${Number(value).toFixed(1)} / 10`, "Score"]}
                  labelStyle={{ color: "rgba(255,255,255,0.4)", marginBottom: 2, fontSize: 10 }}
                  cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#e99846"
                  strokeWidth={2.5}
                  dot={{ fill: "#e99846", r: 4, strokeWidth: 0 }}
                  activeDot={{ fill: "#f0b060", r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── programme cette semaine ────────────────────────────────────── */}
        {(() => {
          const weekNum = daysSince < 7 ? 1 : daysSince < 14 ? 2 : daysSince < 21 ? 3 : 4;

          interface DF { flaw: string; severity: string; fix: string }
          const latestFlaws = ((latest.results as Record<string, unknown>)?.detected_flaws as DF[]) ?? [];
          const prevAnalysis = analyses.length >= 2 ? analyses[analyses.length - 2] : null;
          const prevFlaws: DF[] = prevAnalysis
            ? (((prevAnalysis.results as Record<string, unknown>)?.detected_flaws as DF[]) ?? [])
            : [];

          const sevRank = (s: string) => s === "severe" ? 3 : s === "moderate" ? 2 : 1;

          const prevSevMap = new Map<string, string>();
          for (const f of prevFlaws) prevSevMap.set(f.flaw.toLowerCase().slice(0, 12), f.severity);

          const matchAction = (f: DF) => {
            const n = f.flaw.toLowerCase();
            const w = Math.min(weekNum, 4);
            if (/r.tention|retention|gonfl|puffy|bloat|bouffi|eau/.test(n)) {
              const a = ["Gua sha 10 min", "Gua sha 15 min", "Gua sha 20 min", "Gua sha 25 min + massage sous-mandibulaire"][w - 1];
              return { icon: "🌅", slot: "Matin",    action: a, duration: `S${weekNum}` };
            }
            if (/m.choire|machoire|jaw|menton|chin|recessed|faible/.test(n)) {
              const a = ["Falim gum 20 min + mewing 1h", "Falim gum 25 min + mewing 2h", "Falim gum 30 min + mewing 3h", "Falim gum 35 min + mewing 24/7"][w - 1];
              return { icon: "💪", slot: "Exercice", action: a, duration: `S${weekNum}` };
            }
            if (/cerne|dark.circle|under.eye|tear|yeux creux/.test(n)) {
              const a = ["Sérum caféine 1×/jour", "Sérum caféine 2×/jour", "Sérum caféine 2×/jour + cold compress", "Sérum caféine 2×/jour + cold compress + massage"][w - 1];
              return { icon: "🌙", slot: "Soir",     action: a, duration: `S${weekNum}` };
            }
            if (/acn|peau|texture|skin|scarr|pores|oilin/.test(n)) {
              const a = ["Tretinoin 2×/semaine", "Tretinoin 3×/semaine", "Tretinoin 4×/semaine", "Tretinoin tous les soirs"][w - 1];
              return { icon: "🌙", slot: "Soir",     action: a, duration: `S${weekNum}` };
            }
            if (/double.menton|double.chin|neck|cou/.test(n)) {
              const a = ["Neck curls 3×10", "Neck curls 3×15", "Neck curls 4×15", "Neck curls 4×20 + neck bridges"][w - 1];
              return { icon: "💪", slot: "Exercice", action: a, duration: `S${weekNum}` };
            }
            if (/canthal|tilt|droopy|tombant|posture/.test(n)) {
              const a = ["Chin tucks 5×10", "Chin tucks 5×15", "Chin tucks 6×15", "Chin tucks 6×20 + wall angels"][w - 1];
              return { icon: "💪", slot: "Exercice", action: a, duration: `S${weekNum}` };
            }
            if (/asym/.test(n))
              return { icon: "🌙", slot: "Soir",     action: "Dormir sur le dos, oreiller ferme", duration: "7-9h" };
            return   { icon: "🌅", slot: "Matin",    action: f.fix || "Appliquer le protocole de base", duration: "10 min" };
          };

          const actions = latestFlaws.slice(0, 5).map(f => {
            const key = f.flaw.toLowerCase().slice(0, 12);
            const prevSev = prevSevMap.get(key);
            const status: "new" | "improved" | "persists" = !prevSev ? "new"
              : sevRank(f.severity) < sevRank(prevSev) ? "improved" : "persists";
            return { ...matchAction(f), flaw: f.flaw, status };
          });

          // Deduplicate by action title — merge "Pour" reasons for same action
          const seen = new Map<string, typeof actions[number] & { flaws: string[] }>();
          for (const a of actions) {
            if (seen.has(a.action)) {
              seen.get(a.action)!.flaws.push(a.flaw);
              // Upgrade status: persists > improved > new
              const cur = seen.get(a.action)!;
              if (a.status === "persists") cur.status = "persists";
              else if (a.status === "improved" && cur.status === "new") cur.status = "improved";
            } else {
              seen.set(a.action, { ...a, flaws: [a.flaw] });
            }
          }
          const dedupedActions = Array.from(seen.values());
          if (dedupedActions.length === 0) return null;

          const WEEK_LABELS = [
            "Fondations — 50%",
            "Intensification — 70%",
            "Optimisation — 85%",
            "Peak Performance — 100% 🔥",
          ];

          return (
            <div className="mb-8">
              <h2 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-4">Programme Cette Semaine</h2>
              <div className="rounded-2xl border border-[#e99846]/25 bg-[#e99846]/[0.03] overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
                  <p className="text-sm font-bold text-white/80">{WEEK_LABELS[Math.min(weekNum - 1, 3)]}</p>
                  <span className="px-2.5 py-1 rounded-full bg-[#e99846]/15 border border-[#e99846]/30 text-[#e99846] text-[10px] font-bold tracking-widest uppercase">
                    S{weekNum} / 13
                  </span>
                </div>

                {/* Flaw-driven actions */}
                <div className="flex flex-col divide-y divide-white/[0.04]">
                  {dedupedActions.map((a, i) => (
                    <div key={i} className="px-5 py-3.5 flex items-start gap-3">
                      <span className="text-base flex-none mt-0.5">{a.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#e99846]/60">{a.slot}</span>
                          {!/^S\d+$/.test(a.duration) && (
                            <>
                              <span className="text-[10px] text-white/20">·</span>
                              <span className="text-[10px] text-white/30">{a.duration}</span>
                            </>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-white/80 leading-snug">{a.action}</p>
                        <p className="text-[11px] text-white/35 mt-0.5 leading-snug">Pour : {a.flaws.join(" + ")}</p>
                      </div>
                      {a.status !== "new" && (
                        <span className={`flex-none text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          a.status === "improved"
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        }`}>
                          {a.status === "improved" ? "✅ Amélioré" : "⚠️ À intensifier"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* 90-day progress bar */}
                <div className="px-5 pb-5 pt-4 border-t border-white/[0.06]">
                  <div className="flex justify-between text-[10px] text-white/25 mb-1.5">
                    <span>Jour {daysSince + 1}</span>
                    <span>90 jours</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#e99846]/70 to-[#e99846]"
                      style={{ width: `${Math.min(100, ((daysSince + 1) / 90) * 100).toFixed(1)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── voir dernière analyse + produits recommandés ───────────────── */}
        {(() => {
          interface RP { product: string; brand: string; reason: string; usage: string; amazon_search: string }
          const products = ((latest.results as Record<string, unknown>)?.recommended_products as RP[] | undefined) ?? [];

          return (
            <>
              {/* Button */}
              <div className="mb-6 text-center">
                <Link
                  href="/results"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm bg-[#e99846]/10 border border-[#e99846]/30 text-[#e99846] hover:bg-[#e99846]/20 transition-colors"
                >
                  📊 Voir ma dernière analyse complète →
                </Link>
              </div>

              {/* Recommended products */}
              {products.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-4">Produits Recommandés Pour Toi</h2>
                  <div className="flex flex-col gap-4">
                    {products.map((p, i) => (
                      <div key={i} className="rounded-2xl border border-[#e99846]/25 bg-[#e99846]/[0.03] p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <p className="font-bold text-white text-sm leading-snug">{p.product}</p>
                            <p className="text-xs text-[#e99846]/70 font-semibold mt-0.5">{p.brand}</p>
                          </div>
                          <a
                            href={`https://www.amazon.fr/s?k=${encodeURIComponent(p.amazon_search)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border border-[#e99846]/40 text-[#e99846] hover:bg-[#e99846]/15 transition-colors whitespace-nowrap"
                          >
                            Voir sur Amazon →
                          </a>
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed mb-2.5">{p.reason}</p>
                        <div className="flex items-start gap-2 pt-2.5 border-t border-white/[0.05]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/25 flex-shrink-0 mt-0.5">Usage</span>
                          <span className="text-xs text-white/45 leading-relaxed">{p.usage}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* ── motivation ─────────────────────────────────────────────────── */}
        <div className="mb-8">
          {needsMore && (
            <div className="rounded-2xl border border-[#5fd0bf]/20 bg-[#5fd0bf]/[0.04] p-4 flex items-start gap-3">
              <span className="text-xl flex-none mt-0.5">⏳</span>
              <div>
                <p className="text-sm font-bold text-[#5fd0bf] mb-1">Continue le programme</p>
                <p className="text-xs text-white/40 leading-relaxed">
                  Reviens dans {daysToNext} jour{daysToNext > 1 ? "s" : ""} pour ta prochaine analyse.
                  Il te faut encore {3 - analyses.length} analyse{3 - analyses.length > 1 ? "s" : ""} pour voir ta courbe de progression complète.
                </p>
              </div>
            </div>
          )}
          {isImproving && (
            <div className="rounded-2xl border border-[#e99846]/25 bg-[#e99846]/[0.04] p-4 flex items-start gap-3">
              <span className="text-xl flex-none mt-0.5">🚀</span>
              <div>
                <p className="text-sm font-bold text-[#e99846] mb-1">Tu progresses !</p>
                <p className="text-xs text-white/40 leading-relaxed">
                  Continue le programme — tu es sur la bonne trajectoire. Chaque analyse rapproche de ton potentiel.
                </p>
              </div>
            </div>
          )}
          {isStagnating && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="text-xl flex-none mt-0.5">⚠️</span>
                <div>
                  <p className="text-sm font-bold text-white/80 mb-1">Ton programme a besoin d'ajustements →</p>
                  <p className="text-xs text-white/40 leading-relaxed">
                    Tes scores stagnent. Refais une analyse pour obtenir un plan d'action actualisé.
                  </p>
                </div>
              </div>
              <Link
                href="/upload"
                className="flex-none text-[10px] font-bold text-[#e99846] hover:underline whitespace-nowrap mt-0.5"
              >
                Analyser →
              </Link>
            </div>
          )}
        </div>

        {/* ── history ────────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-4">Historique des analyses</h2>
          <div className="flex flex-col gap-3">
            {history.map((analysis, idx) => {
              const prev = history[idx + 1];
              const scoreDelta =
                prev && typeof prev.score === "number"
                  ? Number((analysis.score! - prev.score).toFixed(1))
                  : null;
              const isFirstAnalysis = idx === history.length - 1;

              return (
                <div
                  key={analysis.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3"
                >
                  {/* Thumbnail */}
                  <div className="flex-none w-11 h-14 rounded-xl overflow-hidden border border-white/10 bg-white/[0.04]">
                    {analysis.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={analysis.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-white/15 text-base">👤</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
                        {fmtFull(analysis.created_at)}
                      </span>
                      {isFirstAnalysis && (
                        <span className="px-1.5 py-0.5 rounded bg-[#5fd0bf]/15 text-[#5fd0bf] text-[8px] font-bold uppercase tracking-wide">
                          Début
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-[#e99846]">{analysis.score!.toFixed(1)}</span>
                      <span className="text-[10px] text-white/25">/10</span>
                    </div>
                    {analysis.results &&
                      typeof (analysis.results as Record<string, unknown>).looksmax_rating === "string" && (
                        <p className="text-[9px] text-white/25 mt-0.5 truncate">
                          {(analysis.results as Record<string, unknown>).looksmax_rating as string}
                        </p>
                      )}
                  </div>

                  {/* Score delta */}
                  <div className="flex-none w-14 text-right">
                    {scoreDelta !== null ? (
                      <div
                        className={`flex items-center justify-end gap-0.5 ${
                          scoreDelta > 0
                            ? "text-green-400"
                            : scoreDelta < 0
                            ? "text-red-400"
                            : "text-white/25"
                        }`}
                      >
                        <span className="text-sm font-bold">
                          {scoreDelta > 0 ? "+" : ""}{scoreDelta}
                        </span>
                        <span className="text-base">
                          {scoreDelta > 0 ? "✅" : scoreDelta < 0 ? "⚠️" : "—"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-white/20 text-xs">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-bold border border-[#e99846]/30 text-[#e99846] hover:bg-[#e99846]/8 transition-all"
            >
              + Nouvelle analyse
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
