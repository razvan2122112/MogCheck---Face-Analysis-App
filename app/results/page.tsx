"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang, LangToggle } from "../context/language";
import { useAuth } from "../context/auth";
import { getBrowserClient } from "@/lib/supabase";
import type { Translations } from "../lib/translations";

interface DetectedFlaw {
  flaw: string;
  severity: "mild" | "moderate" | "severe";
  fix: string;
}

interface ImprovementPlan {
  skincare: string[];
  exercises: string[];
  lifestyle: string[];
  grooming: string[];
}

interface AnalysisResult {
  symmetry_score: number;
  jawline_score: number;
  canthal_tilt: number;
  midface_ratio: number;
  facial_thirds?: number;
  skin_quality?: number;
  overall_score: number;
  looksmax_rating?: string;
  perfect_version?: string;
  potential_score?: number;
  detected_flaws?: DetectedFlaw[];
  improvements: string[];
  improvement_plan?: ImprovementPlan;
  summary?: string;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreBar({ label, score, delay = 0 }: { label: string; score: number; delay?: number }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const pct = Math.min(Math.max(score, 0), 10) * 10;
  const color =
    score >= 8 ? "#4ade80" : score >= 6 ? "#e99846" : score >= 4 ? "#fb923c" : "#f87171";

  return (
    <div className="fade-up" style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium text-white/70">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>
          {score.toFixed(1)} <span className="text-white/25 font-normal text-xs">/ 10</span>
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/[0.07] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: animated ? `${pct}%` : "0%",
            background: `linear-gradient(90deg, ${color}99, ${color})`,
          }}
        />
      </div>
    </div>
  );
}

function RatingLabel({
  score,
  ratings,
}: {
  score: number;
  ratings: Translations["results"]["ratings"];
}) {
  if (score >= 9) return <span className="text-[#4ade80]">{ratings.elite}</span>;
  if (score >= 8) return <span className="text-[#86efac]">{ratings.veryHigh}</span>;
  if (score >= 7) return <span className="text-[#e99846]">{ratings.aboveAverage}</span>;
  if (score >= 6) return <span className="text-[#f0b060]">{ratings.average}</span>;
  if (score >= 5) return <span className="text-[#fb923c]">{ratings.belowAverage}</span>;
  return <span className="text-[#f87171]">{ratings.needsWork}</span>;
}

const SEVERITY_STYLES: Record<string, string> = {
  mild: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  moderate: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  severe: "bg-red-500/10 text-red-400 border border-red-500/20",
};

function PlanSection({
  icon,
  title,
  items,
  accentColor,
  delay,
}: {
  icon: string;
  title: string;
  items: string[];
  accentColor: string;
  delay: number;
}) {
  return (
    <div
      className="rounded-2xl border bg-white/[0.02] p-5 fade-up"
      style={{
        borderColor: `${accentColor}22`,
        animationDelay: `${delay}ms`,
        animationFillMode: "both",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: `${accentColor}15` }}
        >
          {icon}
        </span>
        <h3
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: accentColor }}
        >
          {title}
        </h3>
      </div>
      <ul className="flex flex-col gap-2.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-white/60 leading-relaxed"
          >
            <span
              className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0"
              style={{ background: accentColor }}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Before / After conversion hook ───────────────────────────────────────────

function BeforeAfterSlider({
  photoUrl,
  labelNow,
  onUnlock,
}: {
  photoUrl: string;
  labelNow: string;
  onUnlock: () => void;
}) {
  return (
    <div className="relative w-full overflow-hidden select-none" style={{ aspectRatio: "4/5" }}>
      {/* BEFORE — original photo, left half */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl}
        alt="Before"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
      />

      {/* AFTER — same photo blurred, clipped to right half */}
      <div className="absolute inset-0" style={{ clipPath: "inset(0 0 0 50%)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ filter: "blur(20px)", transform: "scale(1.08)" }}
          draggable={false}
        />
      </div>

      {/* Lock overlay — right half */}
      <div className="absolute top-0 right-0 bottom-0 w-1/2 flex flex-col items-center justify-center gap-3 px-4 text-center"
        style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(10,10,10,0.72) 100%)" }}
      >
        <div className="text-3xl leading-none">🔒</div>
        <div className="flex flex-col gap-1">
          <p className="text-white font-bold text-[11px] leading-tight tracking-wide">
            Débloque ta<br />transformation
          </p>
          <p className="text-white/50 text-[9px] leading-snug">
            Vois ton visage après<br />90 jours de looksmaxxing
          </p>
        </div>
        <button
          onClick={onUnlock}
          className="mt-1 px-3 py-2 rounded-full text-[10px] font-bold tracking-wide bg-[#e99846] text-[#0a0a0a] hover:bg-[#f0b060] transition-colors leading-none"
        >
          Voir ma transformation →
        </button>
      </div>

      {/* Divider */}
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="w-[2px] h-full bg-white/80" />
      </div>

      {/* MAINTENANT label */}
      <div className="absolute bottom-3 left-3 pointer-events-none">
        <span className="px-2 py-1 rounded-lg bg-black/65 backdrop-blur-sm text-white text-[9px] font-bold tracking-[0.15em]">
          {labelNow}
        </span>
      </div>
    </div>
  );
}

// Fallback score-based visual when no photo is available
function ScoreDeltaVisual({
  current,
  potential,
  pw,
}: {
  current: number;
  potential: number;
  pw: Translations["results"]["paywall"];
}) {
  const currentColor =
    current >= 8 ? "#4ade80" : current >= 6 ? "#e99846" : current >= 4 ? "#fb923c" : "#f87171";

  return (
    <div className="flex items-center justify-center gap-6 py-4">
      <div className="flex flex-col items-center gap-1.5">
        <div className="text-[10px] font-mono font-bold tracking-widest text-white/30 uppercase">{pw.now}</div>
        <div className="w-[68px] h-[68px] rounded-full border-[3px] flex items-center justify-center"
          style={{ borderColor: currentColor, background: `${currentColor}12` }}>
          <span className="text-xl font-black" style={{ color: currentColor }}>{current.toFixed(1)}</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 flex-1 max-w-[64px]">
        <div className="w-full h-px bg-gradient-to-r from-white/10 via-[#e99846]/50 to-[#e99846]" />
        <svg className="w-4 h-4 text-[#e99846] -mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
        <div className="text-[9px] font-mono text-[#e99846]/60 tracking-wide font-bold">+{(potential - current).toFixed(1)}</div>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <div className="text-[10px] font-mono font-bold tracking-widest text-[#e99846]/60 uppercase">{pw.potential}</div>
        <div className="w-[68px] h-[68px] rounded-full border-[3px] flex items-center justify-center"
          style={{ borderColor: "#e99846", background: "rgba(233,152,70,0.08)", boxShadow: "0 0 20px rgba(233,152,70,0.3)" }}>
          <span className="text-xl font-black text-[#e99846]">{potential.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}

function tierFromScore(score: number): string {
  if (score >= 9.0) return "GigaChad";
  if (score >= 8.5) return "Chad";
  if (score >= 7.5) return "Very High Tier";
  if (score >= 6.5) return "High Tier";
  if (score >= 5.5) return "Above Average";
  if (score >= 4.5) return "Average";
  if (score >= 3.5) return "Below Average";
  if (score >= 2.5) return "Incel Tier";
  return "Subhuman";
}

// ── Paywall Modal ─────────────────────────────────────────────────────────────

function PaywallModal({
  pw,
  onClose,
  onPay,
  loading,
  error,
}: {
  pw: Translations["results"]["paywall"];
  onClose: () => void;
  onPay: (plan: "once" | "monthly") => void;
  loading: boolean;
  error: string | null;
}) {
  const [selected, setSelected] = useState<"once" | "monthly">("once");
  const features = [pw.feat1, pw.feat2, pw.feat3, pw.feat4];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-[#111] border border-white/10 p-6 pb-8 sm:pb-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-black text-white">{pw.modalTitle}</h2>
            <p className="text-sm text-white/40 mt-0.5">{pw.modalSub}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-colors text-sm flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Feature list */}
        <ul className="flex flex-col gap-2 mb-5">
          {features.map((feat) => (
            <li key={feat} className="flex items-center gap-2.5 text-sm text-white/70">
              <span className="w-5 h-5 rounded-full bg-[#e99846]/15 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-3 h-3 text-[#e99846]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </span>
              {feat}
            </li>
          ))}
        </ul>

        {/* Plan selector */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* One-time */}
          <button
            onClick={() => setSelected("once")}
            className={`relative rounded-2xl border p-3.5 text-left transition-all ${
              selected === "once"
                ? "border-[#e99846] bg-[#e99846]/8"
                : "border-white/10 bg-white/[0.03] hover:border-white/20"
            }`}
          >
            <div className="text-[10px] font-bold text-white/40 mb-1 uppercase tracking-wider">
              {pw.oncePlan}
            </div>
            <div className="text-2xl font-black text-white">{pw.oncePrice}</div>
            <div className="text-[10px] text-white/30 mt-0.5 leading-tight">{pw.onceDesc}</div>
            {selected === "once" && (
              <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#e99846] flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>

          {/* Monthly */}
          <button
            onClick={() => setSelected("monthly")}
            className={`relative rounded-2xl border p-3.5 text-left transition-all ${
              selected === "monthly"
                ? "border-[#e99846] bg-[#e99846]/8"
                : "border-white/10 bg-white/[0.03] hover:border-white/20"
            }`}
          >
            <div className="absolute -top-2.5 left-3">
              <span className="text-[9px] font-bold bg-[#e99846] text-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                {pw.recommended}
              </span>
            </div>
            <div className="text-[10px] font-bold text-white/40 mb-1 uppercase tracking-wider">
              {pw.monthPlan}
            </div>
            <div className="text-2xl font-black text-white">
              {pw.monthPrice}
              <span className="text-xs font-normal text-white/40">{pw.monthPer}</span>
            </div>
            <div className="text-[10px] text-white/30 mt-0.5 leading-tight">{pw.monthDesc}</div>
            {selected === "monthly" && (
              <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#e99846] flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>
        </div>

        {/* Pay button */}
        <button
          onClick={() => onPay(selected)}
          disabled={loading}
          className="w-full py-3.5 rounded-full font-bold text-sm bg-[#e99846] text-[#0a0a0a] hover:bg-[#f0b060] hover:scale-[1.02] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              <span>Redirecting…</span>
            </>
          ) : (
            pw.payBtn
          )}
        </button>

        {error && <p className="mt-3 text-center text-xs text-red-400">{error}</p>}

        <p className="mt-3 text-center text-[10px] text-white/20">
          Secured by Stripe · Cancel anytime
        </p>
      </div>
    </div>
  );
}

// ── Locked metrics preview ────────────────────────────────────────────────────

function LockedMetricsPreview({
  labels,
  pw,
  onUnlock,
}: {
  labels: string[];
  pw: Translations["results"]["paywall"];
  onUnlock: () => void;
}) {
  const fakeScores = [6.4, 5.8, 7.1, 6.0, 7.5, 6.8];

  return (
    <div className="relative rounded-2xl border border-white/[0.06] overflow-hidden mb-6">
      {/* Blurred metric bars */}
      <div
        className="p-6 select-none pointer-events-none"
        style={{ filter: "blur(5px)", opacity: 0.3 }}
        aria-hidden
      >
        <p className="font-bold text-sm uppercase tracking-widest text-white/40 mb-5">
          Metric Breakdown
        </p>
        <div className="flex flex-col gap-5">
          {labels.map((label, i) => (
            <div key={i}>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm text-white/70">{label}</span>
                <span className="text-sm font-bold text-[#e99846]">
                  {fakeScores[i % fakeScores.length].toFixed(1)} / 10
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${fakeScores[i % fakeScores.length] * 10}%`,
                    background: "linear-gradient(90deg, #e9984699, #e99846)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-[#0a0a0a]/20 via-[#0a0a0a]/60 to-[#0a0a0a]/90">
        <div className="text-3xl">🔒</div>
        <div className="text-center px-4">
          <p className="font-bold text-white/80 text-sm">{pw.lockedTitle}</p>
          <p className="text-xs text-white/40 mt-1">{pw.lockedSub}</p>
        </div>
        <button
          onClick={onUnlock}
          className="mt-1 px-6 py-2 rounded-full text-sm font-semibold bg-[#e99846]/15 text-[#e99846] border border-[#e99846]/30 hover:bg-[#e99846]/25 transition-colors"
        >
          Unlock →
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const router   = useRouter();
  const { t }    = useLang();
  const { user, profile, authLoading, signOut, refreshProfile } = useAuth();
  const supabase = useRef(getBrowserClient()).current;

  const [results, setResults]           = useState<AnalysisResult | null>(null);
  const [photoUrl, setPhotoUrl]         = useState<string | null>(null);
  const [loaded, setLoaded]             = useState(false);
  const [verifying, setVerifying]       = useState(false);
  const [isPro, setIsPro]               = useState(false);
  const [showPaywall, setShowPaywall]   = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [payError, setPayError]         = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  // Once Stripe verifies payment, this ref prevents Step 2 from overriding isPro→false
  // when the profile hasn't been updated by the webhook yet.
  const stripeVerifiedRef = useRef(false);

  // ── Step 1: load analysis data from sessionStorage (or pending snapshot) ──
  useEffect(() => {
    const stripeSessionId = new URLSearchParams(window.location.search).get("session_id");
    console.log("[results] Step1 — stripeSessionId:", stripeSessionId ?? "(none)");

    let raw     = sessionStorage.getItem("mogrank_results");
    let photoSS = sessionStorage.getItem("mogrank_photo");
    let aid     = sessionStorage.getItem("mogrank_analysis_id");
    console.log("[results] sessionStorage — analysisId:", aid, "hasResults:", !!raw, "hasPhoto:", !!photoSS);

    // Restore from localStorage snapshot when sessionStorage was wiped (Safari/iOS cross-origin redirect)
    const pendingRaw = localStorage.getItem("mogrank_pending");
    console.log("[results] localStorage mogrank_pending:", pendingRaw ? "present" : "absent");

    if (!raw && stripeSessionId) {
      try {
        if (pendingRaw) {
          const { id, results: savedResults, photo: savedPhoto } = JSON.parse(pendingRaw) as {
            id: string; results: AnalysisResult; photo: string | null;
          };
          console.log("[results] restoring from localStorage pending — id:", id);
          raw = JSON.stringify(savedResults);
          aid = id;
          photoSS = savedPhoto;
          sessionStorage.setItem("mogrank_results", raw);
          sessionStorage.setItem("mogrank_analysis_id", id);
          if (savedPhoto) sessionStorage.setItem("mogrank_photo", savedPhoto);
        } else {
          console.warn("[results] sessionStorage wiped AND no localStorage pending — cannot restore");
        }
      } catch (e) {
        console.error("[results] failed to restore pending:", e);
      }
    }

    // Always clean up pending snapshot when returning from Stripe
    if (stripeSessionId && pendingRaw) {
      localStorage.removeItem("mogrank_pending");
      console.log("[results] cleared mogrank_pending from localStorage");
    }

    if (!raw) {
      console.warn("[results] no analysis data available — redirecting to /upload");
      router.replace("/upload");
      return;
    }
    try {
      setResults(JSON.parse(raw));
      setLoaded(true);
      if (photoSS) setPhotoUrl(photoSS);
      console.log("[results] analysis data loaded, analysisId:", aid);
    } catch (e) {
      console.error("[results] failed to parse results JSON:", e);
      router.replace("/upload");
      return;
    }

    // Stripe redirect: verify payment server-side
    if (stripeSessionId) {
      setVerifying(true);
      console.log("[results] calling /api/verify-payment with session_id:", stripeSessionId);
      fetch(`/api/verify-payment?session_id=${encodeURIComponent(stripeSessionId)}`)
        .then((r) => r.json())
        .then(({ paid }: { paid: boolean }) => {
          console.log("[results] verify-payment returned:", { paid });
          if (paid) {
            // Lock the paid state BEFORE refreshProfile so Step 2 can never override it
            stripeVerifiedRef.current = true;
            setIsPro(true);
            console.log("[results] isPro set to TRUE via Stripe verification");
            // Refresh profile in background — do NOT await (avoids Step 2 race condition)
            refreshProfile().catch(() => {});
          } else {
            console.warn("[results] verify-payment returned paid:false — staying in free mode");
          }
        })
        .catch((err) => {
          console.error("[results] verify-payment fetch error:", err);
        })
        .finally(() => {
          setVerifying(false);
          window.history.replaceState({}, "", "/results");
        });
    }
  }, [router, refreshProfile]);

  // ── Step 2: determine isPro from Supabase profile (runs when profile loads) ─
  useEffect(() => {
    if (authLoading || !loaded) return;

    console.log("[results] Step2 — stripeVerifiedRef:", stripeVerifiedRef.current, "user:", !!user, "profile.plan:", profile?.plan ?? "(no profile)");

    if (!user) {
      if (!stripeVerifiedRef.current) {
        setIsPro(false);
        console.log("[results] Step2 — no user, isPro→false");
      } else {
        console.log("[results] Step2 — no user but stripeVerified, skipping setIsPro(false)");
      }
      return;
    }

    if (!profile) return; // profile still loading

    const aid = sessionStorage.getItem("mogrank_analysis_id");
    console.log("[results] Step2 — aid:", aid, "plan:", profile.plan);

    if (profile.plan === "monthly") {
      setIsPro(true);
      setLimitReached(false);
      console.log("[results] Step2 — monthly plan → isPro=true");
      return;
    }

    if (profile.plan === "once") {
      (async () => {
        try {
          const { data } = await supabase!.from("purchases")
            .select("id")
            .eq("user_id", user.id)
            .eq("analysis_id", aid ?? "")
            .maybeSingle();
          console.log("[results] Step2 — once plan, purchases lookup:", { found: !!data, aid });
          if (!stripeVerifiedRef.current) {
            setIsPro(!!data);
            console.log("[results] Step2 — once plan → isPro:", !!data);
          } else {
            console.log("[results] Step2 — once plan but stripeVerified, skipping setIsPro(", !!data, ")");
          }
          setLimitReached(profile.analyses_used >= profile.analyses_limit);
        } catch {
          if (!stripeVerifiedRef.current) {
            setIsPro(false);
            console.log("[results] Step2 — once plan purchase lookup failed → isPro=false");
          }
        }
      })();
      return;
    }

    // Free plan: not pro
    if (!stripeVerifiedRef.current) {
      setIsPro(false);
      console.log("[results] Step2 — free plan → isPro=false");
    } else {
      console.log("[results] Step2 — free plan but stripeVerified, skipping setIsPro(false)");
    }
  }, [user, profile, authLoading, loaded, supabase]);

  // ── Step 3: save analysis to Supabase when isPro unlocked ─────────────────
  useEffect(() => {
    if (!isPro || !user || !results) return;
    const aid = sessionStorage.getItem("mogrank_analysis_id");
    if (!aid) return;
    (async () => {
      try {
        await supabase!.from("analyses").upsert({
          user_id:    user.id,
          session_id: aid,
          score:      results.overall_score,
          results,
        }, { onConflict: "session_id" });
        refreshProfile();
      } catch {}
    })();
  }, [isPro, user, results, supabase, refreshProfile]);

  const startCheckout = async (plan: "once" | "monthly") => {
    if (!user) {
      // Redirect to login, storing pending data first
      const aid        = sessionStorage.getItem("mogrank_analysis_id");
      const resultsRaw = sessionStorage.getItem("mogrank_results");
      const photoRaw   = sessionStorage.getItem("mogrank_photo");
      if (aid && resultsRaw) {
        localStorage.setItem("mogrank_pending",
          JSON.stringify({ id: aid, results: JSON.parse(resultsRaw), photo: photoRaw }));
      }
      router.push("/auth/login");
      return;
    }

    setCheckoutLoading(true);
    setPayError(null);
    try {
      const aid        = sessionStorage.getItem("mogrank_analysis_id");
      const resultsRaw = sessionStorage.getItem("mogrank_results");
      const photoRaw   = sessionStorage.getItem("mogrank_photo");
      if (aid && resultsRaw) {
        localStorage.setItem("mogrank_pending",
          JSON.stringify({ id: aid, results: JSON.parse(resultsRaw), photo: photoRaw }));
      }
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, analysis_id: aid }),
      });
      const { url, error } = (await res.json()) as { url?: string; error?: string };
      if (url) {
        window.location.href = url;
      } else {
        setPayError(error ?? t.results.paywall.errorPay);
        setCheckoutLoading(false);
      }
    } catch {
      setPayError(t.results.paywall.errorPay);
      setCheckoutLoading(false);
    }
  };

  // ── Spinner ──────────────────────────────────────────────────────────────
  if (!loaded || verifying) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-[#e99846] border-t-transparent rounded-full animate-spin" />
        {verifying && (
          <p className="text-xs text-white/40 font-mono tracking-widest">
            {t.results.paywall.verifying}
          </p>
        )}
      </div>
    );
  }

  if (!results) return null;

  const potentialScore =
    results.potential_score ??
    parseFloat(Math.min(10, results.overall_score + 1.3).toFixed(1));

  const metrics = [
    { label: t.results.metrics.facialSymmetry, score: results.symmetry_score },
    { label: t.results.metrics.jawlineDefinition, score: results.jawline_score },
    { label: t.results.metrics.canthalTilt, score: results.canthal_tilt },
    { label: t.results.metrics.midfaceRatio, score: results.midface_ratio },
    ...(results.facial_thirds != null
      ? [{ label: t.results.metrics.facialThirds, score: results.facial_thirds }]
      : []),
    ...(results.skin_quality != null
      ? [{ label: t.results.metrics.skinQuality, score: results.skin_quality }]
      : []),
  ];

  const planSections = results.improvement_plan
    ? [
        { icon: "🧴", title: t.results.plan.skincare, items: results.improvement_plan.skincare, accentColor: "#60a5fa", delay: 800 },
        { icon: "💪", title: t.results.plan.exercises, items: results.improvement_plan.exercises, accentColor: "#4ade80", delay: 900 },
        { icon: "🌙", title: t.results.plan.lifestyle, items: results.improvement_plan.lifestyle, accentColor: "#a78bfa", delay: 1000 },
        { icon: "✂️", title: t.results.plan.grooming, items: results.improvement_plan.grooming, accentColor: "#e99846", delay: 1100 },
      ]
    : [];

  const pw = t.results.paywall;

  const Nav = (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
      <Link href="/" className="text-xl font-bold tracking-widest gold-text">
        MOGRANK
      </Link>
      <div className="flex items-center gap-3">
        <LangToggle className="flex items-center text-[11px] font-bold tracking-[0.08em] text-white/60 hover:text-white/90 transition-opacity" />
        {user ? (
          <>
            <span className="text-[11px] text-white/30 hidden sm:block truncate max-w-[120px]">
              {user.email}
            </span>
            <button
              onClick={signOut}
              className="text-xs text-white/40 hover:text-white/70 transition-colors border border-white/10 px-3 py-1.5 rounded-full"
            >
              Déconnexion
            </button>
          </>
        ) : (
          <>
            <Link href="/auth/login"
              className="text-xs text-white/40 hover:text-white/70 transition-colors">
              Connexion
            </Link>
            <Link href="/auth/signup"
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#e99846]/15 text-[#e99846] border border-[#e99846]/30 hover:bg-[#e99846]/25 transition-colors">
              Inscription
            </Link>
          </>
        )}
        <Link
          href={limitReached ? "#" : "/upload"}
          onClick={limitReached ? () => setShowPaywall(true) : undefined}
          className="text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          {t.results.newAnalysis}
        </Link>
      </div>
    </nav>
  );

  // ── FULL RESULTS (pro unlocked) ───────────────────────────────────────────
  if (isPro) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col">
        {Nav}
        <div className="flex-1 w-full max-w-2xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-10 fade-up">
            <p className="text-xs uppercase tracking-[0.3em] text-[#e99846] mb-3 font-semibold">
              {t.results.yourResults}
            </p>
            <h1 className="text-4xl sm:text-5xl font-black mb-2">{t.results.overallScore}</h1>

            <div className="flex justify-center my-8">
              <div className="relative w-40 h-40">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="44" fill="none" stroke="#e99846" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * (1 - results.overall_score / 10)}`}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-[#e99846]">
                    {results.overall_score.toFixed(1)}
                  </span>
                  <span className="text-xs text-white/40">/ 10</span>
                </div>
              </div>
            </div>

            <p className="text-xl font-bold">
              {t.results.rating}{" "}
              <RatingLabel score={results.overall_score} ratings={t.results.ratings} />
            </p>
            {results.looksmax_rating && (
              <p className="mt-2 text-xs uppercase tracking-widest text-white/30">
                {t.results.looksmaxTier}{" "}
                <span className="text-[#e99846]/70">{results.looksmax_rating}</span>
              </p>
            )}
            {results.summary && (
              <p className="text-white/40 text-sm mt-4 max-w-md mx-auto leading-relaxed">
                {results.summary}
              </p>
            )}
          </div>

          {/* Score breakdown */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 mb-6">
            <h2 className="font-bold text-sm uppercase tracking-widest text-white/40 mb-5">
              {t.results.metricBreakdown}
            </h2>
            <div className="flex flex-col gap-5">
              {metrics.map((m, i) => (
                <ScoreBar key={m.label} label={m.label} score={m.score} delay={i * 120} />
              ))}
            </div>
          </div>

          {/* Detected Flaws */}
          {results.detected_flaws && results.detected_flaws.length > 0 && (
            <div
              className="rounded-2xl border border-red-500/10 bg-red-500/[0.03] p-6 mb-6 fade-up"
              style={{ animationDelay: "500ms", animationFillMode: "both" }}
            >
              <h2 className="font-bold text-sm uppercase tracking-widest text-red-400/60 mb-4">
                {t.results.detectedFlaws}
              </h2>
              <div className="flex flex-col gap-3">
                {results.detected_flaws.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                        SEVERITY_STYLES[item.severity] ?? SEVERITY_STYLES.mild
                      }`}
                    >
                      {item.severity}
                    </span>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm text-white/75 font-medium">{item.flaw}</span>
                      <span className="text-xs text-white/35 leading-relaxed">{item.fix}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Wins */}
          {results.improvements.length > 0 && (
            <div
              className="rounded-2xl border border-[#e99846]/15 bg-[#e99846]/5 p-6 mb-6 fade-up"
              style={{ animationDelay: "620ms", animationFillMode: "both" }}
            >
              <h2 className="font-bold text-sm uppercase tracking-widest text-[#e99846]/70 mb-4">
                {t.results.quickWins}
              </h2>
              <ul className="flex flex-col gap-3">
                {results.improvements.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm text-white/60 leading-relaxed"
                  >
                    <span className="mt-0.5 text-[#e99846] flex-shrink-0">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Personalized Improvement Plan */}
          {planSections.length > 0 && (
            <div className="mb-8">
              <div
                className="mb-5 fade-up"
                style={{ animationDelay: "750ms", animationFillMode: "both" }}
              >
                <p className="text-xs uppercase tracking-[0.3em] text-[#e99846] mb-1 font-semibold">
                  {t.results.personalized}
                </p>
                <h2 className="text-2xl font-black">{t.results.improvementPlan}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {planSections.map((s) => (
                  <PlanSection key={s.title} {...s} />
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/upload"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-semibold text-sm bg-[#e99846] text-[#0a0a0a] hover:bg-[#f0b060] transition-all hover:scale-105"
            >
              {t.results.analyzeAnother}
            </Link>
            <button
              onClick={() => {
                const text = `${t.results.copyText}\nOverall: ${results.overall_score.toFixed(1)}/10${results.looksmax_rating ? ` (${results.looksmax_rating})` : ""}\n${t.results.metrics.facialSymmetry}: ${results.symmetry_score.toFixed(1)}\n${t.results.metrics.jawlineDefinition}: ${results.jawline_score.toFixed(1)}\n${t.results.metrics.canthalTilt}: ${results.canthal_tilt.toFixed(1)}\n${t.results.metrics.midfaceRatio}: ${results.midface_ratio.toFixed(1)}`;
                navigator.clipboard.writeText(text);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-semibold text-sm border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors"
            >
              {t.results.copyResults}
            </button>
          </div>

          <p className="mt-8 text-center text-xs text-white/20">{t.results.disclaimer}</p>
        </div>
      </main>
    );
  }

  // ── TEASER (free, pre-payment) ────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col">
      {Nav}

      {showPaywall && (
        <PaywallModal
          pw={pw}
          onClose={() => { setShowPaywall(false); setPayError(null); }}
          onPay={startCheckout}
          loading={checkoutLoading}
          error={payError}
        />
      )}

      <div className="flex-1 w-full max-w-xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-6 fade-up">
          <p className="text-xs uppercase tracking-[0.3em] text-[#e99846] mb-3 font-semibold">
            {t.results.yourResults}
          </p>
          <h1 className="text-4xl sm:text-5xl font-black mb-2">{t.results.overallScore}</h1>
        </div>

        {/* Score circle */}
        <div
          className="flex justify-center mb-4 fade-up"
          style={{ animationDelay: "100ms", animationFillMode: "both" }}
        >
          <div className="relative w-36 h-36">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="44" fill="none" stroke="#e99846" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - results.overall_score / 10)}`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-[#e99846]">
                {results.overall_score.toFixed(1)}
              </span>
              <span className="text-xs text-white/40">/ 10</span>
            </div>
          </div>
        </div>

        {/* Rating */}
        <p
          className="text-xl font-bold text-center mb-1 fade-up"
          style={{ animationDelay: "200ms", animationFillMode: "both" }}
        >
          {t.results.rating}{" "}
          <RatingLabel score={results.overall_score} ratings={t.results.ratings} />
        </p>
        {results.looksmax_rating && (
          <p
            className="text-center text-xs uppercase tracking-widest text-white/30 mb-8 fade-up"
            style={{ animationDelay: "250ms", animationFillMode: "both" }}
          >
            {t.results.looksmaxTier}{" "}
            <span className="text-[#e99846]/70">{results.looksmax_rating}</span>
          </p>
        )}

        {/* Potential section — slider or score visual */}
        <div
          className="rounded-2xl border border-[#e99846]/20 bg-gradient-to-b from-[#e99846]/8 to-[#e99846]/3 overflow-hidden mb-5 fade-up"
          style={{ animationDelay: "350ms", animationFillMode: "both" }}
        >
          {photoUrl ? (
            <BeforeAfterSlider
              photoUrl={photoUrl}
              labelNow={pw.labelNow}
              onUnlock={() => setShowPaywall(true)}
            />
          ) : (
            <div className="px-6 pt-5">
              <ScoreDeltaVisual
                current={results.overall_score}
                potential={potentialScore}
                pw={pw}
              />
            </div>
          )}

          <div className="px-5 pb-5 pt-4">
            {/* Dream face header + date */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e99846]">
                {pw.dreamFace}
              </p>
              <p className="text-[10px] font-mono text-white/30">
                {new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString(
                  typeof navigator !== "undefined" && navigator.language
                    ? navigator.language
                    : "en-US",
                  { day: "numeric", month: "short", year: "numeric" }
                )}
              </p>
            </div>

            {/* Tier progression */}
            {results.looksmax_rating && (
              <div className="flex items-center gap-2 text-sm mb-3">
                <span className="text-white/45 font-semibold">{results.looksmax_rating}</span>
                <svg className="w-3.5 h-3.5 text-[#e99846]/50 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
                <span className="text-[#e99846] font-bold">{tierFromScore(potentialScore)}</span>
              </div>
            )}

            {/* AI description */}
            {results.perfect_version && (
              <p className="text-xs text-white/55 leading-relaxed mb-3">
                {results.perfect_version}
              </p>
            )}

            {/* Timeline */}
            <div className="flex items-center gap-2 pt-3 border-t border-[#e99846]/15">
              <span className="text-[#e99846] text-sm">⏱</span>
              <p className="text-xs text-[#e99846]/70 font-semibold">{pw.timeline}</p>
            </div>
          </div>
        </div>

        {/* Locked metrics preview */}
        <LockedMetricsPreview
          labels={metrics.map((m) => m.label)}
          pw={pw}
          onUnlock={() => setShowPaywall(true)}
        />

        {/* Main CTA */}
        <button
          onClick={() => setShowPaywall(true)}
          className="w-full py-4 rounded-full font-black text-base bg-[#e99846] text-[#0a0a0a] hover:bg-[#f0b060] hover:scale-[1.02] transition-all shadow-xl shadow-[#e99846]/20 fade-up"
          style={{ animationDelay: "500ms", animationFillMode: "both" }}
        >
          {pw.ctaBtn}
        </button>

        <p className="mt-6 text-center text-xs text-white/20">{t.results.disclaimer}</p>
      </div>
    </main>
  );
}
