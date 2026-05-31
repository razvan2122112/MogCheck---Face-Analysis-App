"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang, LangToggle } from "../context/language";
import { useAuth } from "../context/auth";
import { getBrowserClient } from "@/lib/supabase";
import type { Translations } from "../lib/translations";

interface DetectedFlawProduct {
  name: string;
  amazon_search: string;
}

interface DetectedFlaw {
  flaw: string;
  severity: "mild" | "moderate" | "severe";
  fix?: string;           // legacy fallback
  protocol?: string;      // new: 1-2 sentence action
  exercises?: string[];   // new: max 2, flaw-specific
  products?: DetectedFlawProduct[]; // new: max 3, flaw-specific
  lifestyle?: string[];   // new: max 2, flaw-specific
}

interface ImprovementPlan {
  skincare: string[];
  exercises: string[];
  lifestyle: string[];
  grooming: string[];
}

interface DayProgram {
  day: number;
  morning: string[];
  evening: string[];
  exercise: string;
}

type DailyProgram = DayProgram[];

interface RecommendedProduct {
  product: string;
  brand: string;
  reason: string;
  usage: string;
  amazon_search: string;
}

interface FacialDetails {
  eyebrows?: string;
  beard?: string;
  hair?: string;
  skin?: string;
  cheeks?: string;
  chin?: string;
  cheekbones?: string;
  neck_posture?: string;
}

interface Supplement {
  name: string;
  dose: string;
  benefit: string;
  amazon_search: string;
}

interface SkincareProduct {
  product: string;
  ingredient: string;
  amazon_search: string;
}

interface SkincareRoutine {
  morning: SkincareProduct[];
  evening: SkincareProduct[];
}

interface WaterRetention {
  level: string;
  causes: string[];
  solutions: string[];
}

interface BodyFatTarget {
  current_estimate: string;
  target: string;
  impact_on_face: string;
}

interface MewingProtocol {
  current_posture: string;
  steps: string[];
  youtube_search: string;
}

interface SleepProtocol {
  hours: number;
  tips: string[];
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
  daily_program?: DailyProgram | null;
  recommended_products?: RecommendedProduct[] | null;
  facial_details?: FacialDetails;
  supplements?: Supplement[];
  skincare?: SkincareRoutine;
  water_retention?: WaterRetention;
  body_fat_target?: BodyFatTarget;
  mewing?: MewingProtocol;
  sleep_protocol?: SleepProtocol;
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

// ── Flaw Card (expandable) ────────────────────────────────────────────────────

function FlawCard({ flaw, index }: { flaw: DetectedFlaw; index: number }) {
  const [open, setOpen] = useState(false);

  const borderColor =
    flaw.severity === "severe"
      ? "rgba(248,113,113,0.18)"
      : flaw.severity === "moderate"
      ? "rgba(251,146,60,0.15)"
      : "rgba(250,204,21,0.12)";

  const protocolText = flaw.protocol ?? flaw.fix ?? "";

  return (
    <div
      className="rounded-2xl border overflow-hidden fade-up"
      style={{
        borderColor,
        animationDelay: `${500 + index * 70}ms`,
        animationFillMode: "both",
      }}
    >
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.025] transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex-1 text-sm font-medium text-white/80 leading-snug min-w-0">
          {flaw.flaw}
        </span>
        <span
          className={`flex-none text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${
            SEVERITY_STYLES[flaw.severity] ?? SEVERITY_STYLES.mild
          }`}
        >
          {flaw.severity}
        </span>
        <svg
          className={`w-4 h-4 flex-none text-white/25 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable body */}
      {open && (
        <div
          className="border-t px-4 pt-4 pb-4 flex flex-col gap-4 bg-white/[0.01]"
          style={{ borderColor }}
        >
          {/* 📋 Protocole */}
          {protocolText && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2">
                📋 Protocole
              </p>
              <p className="text-sm text-white/65 leading-relaxed">{protocolText}</p>
            </div>
          )}

          {/* 💪 Exercices */}
          {flaw.exercises && flaw.exercises.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#4ade80]/55 mb-2">
                💪 Exercices
              </p>
              <ul className="flex flex-col gap-1.5">
                {flaw.exercises.map((ex, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/55 leading-relaxed">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-[#4ade80]/40 flex-shrink-0" />
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 🛍️ Produits */}
          {flaw.products && flaw.products.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#e99846]/55 mb-2">
                🛍️ Produits
              </p>
              <div className="flex flex-col gap-2">
                {flaw.products.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-white/60 leading-relaxed flex-1 min-w-0">{p.name}</span>
                    <a
                      href={`https://www.amazon.fr/s?k=${encodeURIComponent(p.amazon_search)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-none text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#e99846]/30 text-[#e99846] hover:bg-[#e99846]/10 transition-colors whitespace-nowrap"
                    >
                      Amazon →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🌙 Mode de vie */}
          {flaw.lifestyle && flaw.lifestyle.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#a78bfa]/55 mb-2">
                🌙 Mode de vie
              </p>
              <ul className="flex flex-col gap-1.5">
                {flaw.lifestyle.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/55 leading-relaxed">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-[#a78bfa]/40 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
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

// ── Facial Details Section ────────────────────────────────────────────────────

const ZONE_CONFIG: Array<{ key: keyof FacialDetails; icon: string; label: string }> = [
  { key: "eyebrows",     icon: "〰️", label: "Sourcils" },
  { key: "beard",        icon: "🧔", label: "Barbe" },
  { key: "hair",         icon: "💈", label: "Cheveux" },
  { key: "skin",         icon: "🧴", label: "Peau" },
  { key: "cheeks",       icon: "😊", label: "Joues" },
  { key: "chin",         icon: "🦷", label: "Menton" },
  { key: "cheekbones",   icon: "💀", label: "Pommettes" },
  { key: "neck_posture", icon: "🦒", label: "Posture / Cou" },
];

function FacialDetailsSection({ details }: { details: FacialDetails }) {
  const zones = ZONE_CONFIG.filter(z => details[z.key]);
  if (zones.length === 0) return null;
  return (
    <div className="mb-8 fade-up" style={{ animationDelay: "450ms", animationFillMode: "both" }}>
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.3em] text-[#5fd0bf] mb-1 font-semibold">Analyse visuelle</p>
        <h2 className="text-2xl font-black">Analyse par zone</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {zones.map(z => (
          <div key={z.key} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg leading-none">{z.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{z.label}</span>
            </div>
            <p className="text-sm text-white/65 leading-relaxed">{details[z.key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Skincare Routine Section ──────────────────────────────────────────────────

function SkincareRoutineSection({ skincare }: { skincare: SkincareRoutine }) {
  const hasItems = (skincare.morning?.length ?? 0) > 0 || (skincare.evening?.length ?? 0) > 0;
  if (!hasItems) return null;

  const ProductCard = ({ p, slot }: { p: SkincareProduct; slot: "morning" | "evening" }) => (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-white/[0.04] last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white/80 leading-snug">{p.product}</p>
        <p className="text-[11px] text-white/35 mt-0.5">{p.ingredient}</p>
      </div>
      <a
        href={`https://www.amazon.fr/s?k=${encodeURIComponent(p.amazon_search)}`}
        target="_blank" rel="noopener noreferrer"
        className={`flex-none text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap transition-colors ${
          slot === "morning"
            ? "border-[#e99846]/35 text-[#e99846] hover:bg-[#e99846]/10"
            : "border-[#a78bfa]/35 text-[#a78bfa] hover:bg-[#a78bfa]/10"
        }`}
      >
        Amazon →
      </a>
    </div>
  );

  return (
    <div className="mb-8 fade-up" style={{ animationDelay: "680ms", animationFillMode: "both" }}>
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.3em] text-[#e99846] mb-1 font-semibold">Routine personnalisée</p>
        <h2 className="text-2xl font-black">Skincare Matin / Soir</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {skincare.morning?.length > 0 && (
          <div className="rounded-2xl border border-[#e99846]/20 bg-[#e99846]/[0.02] p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🌅</span>
              <span className="text-xs font-bold uppercase tracking-widest text-[#e99846]/70">Routine Matin</span>
            </div>
            {skincare.morning.map((p, i) => <ProductCard key={i} p={p} slot="morning" />)}
          </div>
        )}
        {skincare.evening?.length > 0 && (
          <div className="rounded-2xl border border-[#a78bfa]/20 bg-[#a78bfa]/[0.02] p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🌙</span>
              <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]/70">Routine Soir</span>
            </div>
            {skincare.evening.map((p, i) => <ProductCard key={i} p={p} slot="evening" />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Supplements Section ───────────────────────────────────────────────────────

function SupplementsSection({ supplements }: { supplements: Supplement[] }) {
  if (!supplements?.length) return null;
  return (
    <div className="mb-8 fade-up" style={{ animationDelay: "750ms", animationFillMode: "both" }}>
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.3em] text-[#4ade80] mb-1 font-semibold">Protocole interne</p>
        <h2 className="text-2xl font-black">Suppléments</h2>
      </div>
      <div className="flex flex-col gap-3">
        {supplements.map((s, i) => (
          <div key={i} className="rounded-2xl border border-[#4ade80]/15 bg-[#4ade80]/[0.02] p-4 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <p className="font-bold text-white text-sm">{s.name}</p>
                <span className="text-[10px] font-mono text-[#4ade80]/70 border border-[#4ade80]/25 px-1.5 py-0.5 rounded-full">{s.dose}</span>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">{s.benefit}</p>
            </div>
            <a
              href={`https://www.amazon.fr/s?k=${encodeURIComponent(s.amazon_search)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex-none text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#4ade80]/35 text-[#4ade80] hover:bg-[#4ade80]/10 transition-colors whitespace-nowrap"
            >
              Amazon →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Water Retention Section ───────────────────────────────────────────────────

const WR_LEVEL: Record<string, { label: string; color: string; bg: string; border: string; pct: number }> = {
  none:     { label: "Aucune",   color: "#4ade80", bg: "rgba(74,222,128,0.05)", border: "rgba(74,222,128,0.2)",  pct: 5  },
  mild:     { label: "Légère",   color: "#e99846", bg: "rgba(233,152,70,0.05)", border: "rgba(233,152,70,0.2)",  pct: 35 },
  moderate: { label: "Modérée",  color: "#fb923c", bg: "rgba(251,146,60,0.05)", border: "rgba(251,146,60,0.2)",  pct: 65 },
  severe:   { label: "Sévère",   color: "#f87171", bg: "rgba(248,113,113,0.05)", border: "rgba(248,113,113,0.2)", pct: 95 },
};

function WaterRetentionSection({ wr }: { wr: WaterRetention }) {
  const cfg = WR_LEVEL[wr.level] ?? WR_LEVEL.mild;
  return (
    <div className="mb-8 fade-up" style={{ animationDelay: "820ms", animationFillMode: "both" }}>
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.3em] text-[#60a5fa] mb-1 font-semibold">Inflammation faciale</p>
        <h2 className="text-2xl font-black">Rétention d&apos;eau</h2>
      </div>
      <div className="rounded-2xl border p-5" style={{ borderColor: cfg.border, background: cfg.bg }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: cfg.color }}>Niveau détecté</span>
          <span className="text-sm font-black" style={{ color: cfg.color }}>{cfg.label}</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden mb-5">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${cfg.pct}%`, background: cfg.color }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {wr.causes?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">Causes</p>
              <ul className="flex flex-col gap-1.5">
                {wr.causes.map((c, i) => (
                  <li key={i} className="flex gap-1.5 text-xs text-white/55 leading-snug">
                    <span style={{ color: cfg.color }} className="flex-none mt-0.5">›</span>{c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {wr.solutions?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">Solutions</p>
              <ul className="flex flex-col gap-1.5">
                {wr.solutions.map((s, i) => (
                  <li key={i} className="flex gap-1.5 text-xs text-white/55 leading-snug">
                    <span className="text-[#4ade80] flex-none mt-0.5">✓</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Body Fat Target Section ───────────────────────────────────────────────────

function BodyFatSection({ bft }: { bft: BodyFatTarget }) {
  return (
    <div className="mb-8 fade-up" style={{ animationDelay: "860ms", animationFillMode: "both" }}>
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.3em] text-[#60a5fa] mb-1 font-semibold">Composition corporelle</p>
        <h2 className="text-2xl font-black">Body Fat Objectif</h2>
      </div>
      <div className="rounded-2xl border border-[#60a5fa]/20 bg-[#60a5fa]/[0.02] p-5">
        <div className="flex items-center gap-6 mb-4">
          <div className="text-center">
            <p className="text-[10px] text-white/30 mb-1 uppercase tracking-wider">Actuel estimé</p>
            <p className="text-3xl font-black text-white/70">{bft.current_estimate}</p>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-[#60a5fa]/50" />
            <svg className="w-5 h-5 text-[#60a5fa] flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-[#60a5fa]/60 mb-1 uppercase tracking-wider">Objectif</p>
            <p className="text-3xl font-black text-[#60a5fa]">{bft.target}</p>
          </div>
        </div>
        <div className="pt-4 border-t border-white/[0.05]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">Impact sur le visage</p>
          <p className="text-sm text-white/60 leading-relaxed">{bft.impact_on_face}</p>
        </div>
      </div>
    </div>
  );
}

// ── Mewing Section ────────────────────────────────────────────────────────────

function MewingSection({ mewing }: { mewing: MewingProtocol }) {
  return (
    <div className="mb-8 fade-up" style={{ animationDelay: "900ms", animationFillMode: "both" }}>
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.3em] text-[#a78bfa] mb-1 font-semibold">Posture linguale</p>
        <h2 className="text-2xl font-black">Mewing Protocol</h2>
      </div>
      <div className="rounded-2xl border border-[#a78bfa]/20 bg-[#a78bfa]/[0.02] p-5">
        <div className="flex items-start gap-3 mb-5 pb-5 border-b border-white/[0.05]">
          <span className="text-2xl flex-none">👅</span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#a78bfa]/60 mb-1">Posture actuelle</p>
            <p className="text-sm text-white/65 leading-relaxed">{mewing.current_posture}</p>
          </div>
        </div>
        {mewing.steps?.length > 0 && (
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Protocole</p>
            <ol className="flex flex-col gap-2.5">
              {mewing.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-white/65 leading-relaxed">
                  <span className="flex-none w-5 h-5 rounded-full bg-[#a78bfa]/15 border border-[#a78bfa]/30 flex items-center justify-center text-[10px] font-black text-[#a78bfa] mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}
        {mewing.youtube_search && (
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(mewing.youtube_search)}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border border-[#a78bfa]/30 text-[#a78bfa] hover:bg-[#a78bfa]/15 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            Voir tutoriel YouTube →
          </a>
        )}
      </div>
    </div>
  );
}

// ── Sleep Protocol Section ────────────────────────────────────────────────────

function SleepProtocolSection({ sleep }: { sleep: SleepProtocol }) {
  return (
    <div className="rounded-2xl border border-[#2dd4bf]/15 bg-[#2dd4bf]/[0.02] p-5 mb-6 fade-up" style={{ animationDelay: "960ms", animationFillMode: "both" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">😴</span>
          <span className="text-xs font-bold uppercase tracking-widest text-[#2dd4bf]/70">Protocole Sommeil</span>
        </div>
        <span className="text-lg font-black text-[#2dd4bf]">{sleep.hours}h</span>
      </div>
      {sleep.tips?.length > 0 && (
        <ul className="flex flex-col gap-2">
          {sleep.tips.map((tip, i) => (
            <li key={i} className="flex gap-2 text-sm text-white/60 leading-relaxed">
              <span className="text-[#2dd4bf]/50 flex-none mt-0.5">›</span>{tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Daily Program Section ─────────────────────────────────────────────────────

function DailyProgramSection({ program }: { program: DailyProgram }) {
  return (
    <div className="mb-8 fade-up" style={{ animationDelay: "1200ms", animationFillMode: "both" }}>
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.3em] text-[#2dd4bf] mb-1 font-semibold">
          Ton Programme
        </p>
        <h2 className="text-2xl font-black">Programme 7 Jours</h2>
      </div>
      <div className="flex flex-col gap-3">
        {program.map((day) => (
          <div key={day.day} className="rounded-2xl border border-[#2dd4bf]/15 bg-[#2dd4bf]/[0.02] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#2dd4bf]/50 mb-3">
              Jour {day.day}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#e99846]/70 mb-2">
                  🌅 Matin
                </p>
                <ul className="flex flex-col gap-1.5">
                  {day.morning.map((action, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-white/60 leading-snug">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-[#e99846]/50 flex-shrink-0" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#2dd4bf]/70 mb-2">
                  🌙 Soir
                </p>
                <ul className="flex flex-col gap-1.5">
                  {day.evening.map((action, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-white/60 leading-snug">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-[#2dd4bf]/50 flex-shrink-0" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-2 pt-2.5 border-t border-white/[0.05]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#a78bfa]/60 flex-shrink-0 mt-0.5">
                💪 Exercice
              </span>
              <span className="text-xs text-white/55 leading-snug">{day.exercise}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Recommended Products Section ──────────────────────────────────────────────

function RecommendedProductsSection({ products }: { products: RecommendedProduct[] }) {
  return (
    <div className="mb-8 fade-up" style={{ animationDelay: "1350ms", animationFillMode: "both" }}>
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.3em] text-[#e99846] mb-1 font-semibold">
          Sélection Personnalisée
        </p>
        <h2 className="text-2xl font-black">Produits Recommandés Pour Toi</h2>
      </div>
      <div className="flex flex-col gap-4">
        {products.map((product, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[#e99846]/25 bg-[#e99846]/[0.03] p-5"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="font-bold text-white text-sm leading-snug">{product.product}</p>
                <p className="text-xs text-[#e99846]/70 font-semibold mt-0.5">{product.brand}</p>
              </div>
              <a
                href={`https://www.amazon.fr/s?k=${encodeURIComponent(product.amazon_search)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border border-[#e99846]/40 text-[#e99846] hover:bg-[#e99846]/15 transition-colors whitespace-nowrap"
              >
                Voir sur Amazon →
              </a>
            </div>
            <p className="text-xs text-white/60 leading-relaxed mb-2.5">{product.reason}</p>
            <div className="flex items-start gap-2 pt-2.5 border-t border-white/[0.05]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/25 flex-shrink-0 mt-0.5">
                Usage
              </span>
              <span className="text-xs text-white/45 leading-relaxed">{product.usage}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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

// ── Used-analysis upsell modal (once plan, 0 remaining) ──────────────────────

function UsedAnalysisModal({
  onClose,
  onPay,
  loading,
  error,
}: {
  onClose: () => void;
  onPay: (plan: "once" | "monthly") => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-[#111] border border-white/10 p-6 pb-8 sm:pb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-white">Tu as utilisé ton analyse</h2>
            <p className="text-sm text-white/40 mt-1">
              Passe au plan mensuel pour des analyses illimitées
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-colors text-sm flex-shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3 mt-5">
          <button
            onClick={() => onPay("monthly")}
            disabled={loading}
            className="w-full py-3.5 rounded-full font-bold text-sm bg-[#e99846] text-[#0a0a0a] hover:bg-[#f0b060] hover:scale-[1.02] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>Redirecting…</span>
              </>
            ) : (
              "Plan mensuel $9.99/mois"
            )}
          </button>
          <button
            onClick={() => onPay("once")}
            disabled={loading}
            className="w-full py-3.5 rounded-full font-semibold text-sm border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Une nouvelle analyse $4.99
          </button>
        </div>

        {error && <p className="mt-3 text-center text-xs text-red-400">{error}</p>}
        <p className="mt-3 text-center text-[10px] text-white/20">
          Secured by Stripe · Cancel anytime
        </p>
      </div>
    </div>
  );
}

function MonthlyOnlyModal({
  onClose,
  onPay,
  loading,
  error,
}: {
  onClose: () => void;
  onPay: (plan: "once" | "monthly") => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-[#111] border border-white/10 p-6 pb-8 sm:pb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-white">Analyses illimitées</h2>
            <p className="text-sm text-white/40 mt-1">
              Passe au plan mensuel pour analyser autant de photos que tu veux
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-colors text-sm flex-shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="mt-5">
          <button
            onClick={() => onPay("monthly")}
            disabled={loading}
            className="w-full py-3.5 rounded-full font-bold text-sm bg-[#e99846] text-[#0a0a0a] hover:bg-[#f0b060] hover:scale-[1.02] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>Redirecting…</span>
              </>
            ) : (
              "Plan mensuel $9.99/mois"
            )}
          </button>
        </div>

        {error && <p className="mt-3 text-center text-xs text-red-400">{error}</p>}
        <p className="mt-3 text-center text-[10px] text-white/20">
          Secured by Stripe · Cancel anytime
        </p>
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
  const [showUsedModal, setShowUsedModal] = useState(false);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [supabaseFallbackNeeded, setSupabaseFallbackNeeded] = useState(false);

  // Set true by Step 1 (Stripe redirect) so Step 2 never overrides isPro→false
  // before the webhook has updated the profile.
  const stripeVerifiedRef = useRef(false);
  // Holds the Stripe session ID so Step 4 can mark the purchase as used.
  const stripeSessionIdRef = useRef("");
  // Prevents Step 2 from calling verify-payment (and decrementing analyses_remaining) more than once.
  const consumedRef = useRef(false);

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
      console.warn("[results] no analysis data in sessionStorage — trying Supabase fallback");
      setSupabaseFallbackNeeded(true);
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
      stripeSessionIdRef.current = stripeSessionId; // stored for Step 4 mark-used
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

  // ── Step 1b: Supabase fallback when sessionStorage was empty ────────────────
  useEffect(() => {
    if (!supabaseFallbackNeeded || authLoading) return;
    if (!user || !supabase) {
      router.replace("/upload");
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("analyses")
          .select("results, score, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.results) {
          console.log("[results] loaded last analysis from Supabase, created_at:", data.created_at);
          setResults(data.results as AnalysisResult);
          setLoaded(true);
        } else {
          console.warn("[results] no analysis found in Supabase — redirecting to /upload");
          router.replace("/upload");
        }
      } catch (err) {
        console.error("[results] Supabase fallback error:", err);
        router.replace("/upload");
      }
    })();
  }, [supabaseFallbackNeeded, authLoading, user, supabase, router]);

  // ── Step 2: check analyses_remaining server-side (runs once per session) ──
  useEffect(() => {
    if (authLoading || !loaded) return;

    if (!user) {
      if (!stripeVerifiedRef.current) setIsPro(false);
      return;
    }

    if (consumedRef.current) return;
    consumedRef.current = true;

    fetch("/api/verify-payment")
      .then((r) => r.json())
      .then(({ paid }: { paid: boolean }) => {
        if (!stripeVerifiedRef.current) setIsPro(paid);
        setLimitReached(!paid);
      })
      .catch(() => {
        if (!stripeVerifiedRef.current) setIsPro(false);
      });
  }, [user, authLoading, loaded]);

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

  // ── Step 4: mark the Stripe purchase as used once paid results are shown ────
  useEffect(() => {
    const sid = stripeSessionIdRef.current;
    if (!isPro || !sid || !user) return;
    stripeSessionIdRef.current = ""; // clear so this fires only once
    fetch("/api/mark-used", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stripe_session_id: sid }),
    }).catch(() => {});
  }, [isPro, user]);

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

  const pw = t.results.paywall;

  const Nav = (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
      <Link href="/" className="text-xl font-bold tracking-widest gold-text">
        FaceUP
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
          onClick={limitReached ? () => {
            if (profile?.plan === "once") {
              setShowUsedModal(true);
            } else {
              setShowPaywall(true);
            }
          } : undefined}
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
        {showMonthlyModal && (
          <MonthlyOnlyModal
            onClose={() => { setShowMonthlyModal(false); setPayError(null); }}
            onPay={startCheckout}
            loading={checkoutLoading}
            error={payError}
          />
        )}
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

          {/* Défauts détectés — expandable cards */}
          {results.detected_flaws && results.detected_flaws.length > 0 && (
            <div className="mb-6">
              <div className="mb-4 fade-up" style={{ animationDelay: "480ms", animationFillMode: "both" }}>
                <p className="text-xs uppercase tracking-[0.3em] text-red-400/60 mb-1 font-semibold">
                  {t.results.detectedFlaws}
                </p>
                <h2 className="text-2xl font-black">Protocoles correctifs</h2>
              </div>
              <div className="flex flex-col gap-2">
                {results.detected_flaws.map((flaw, i) => (
                  <FlawCard key={i} flaw={flaw} index={i} />
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
                  <li key={i} className="flex items-start gap-3 text-sm text-white/60 leading-relaxed">
                    <span className="mt-0.5 text-[#e99846] flex-shrink-0">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suppléments */}
          {results.supplements && results.supplements.length > 0 && (
            <SupplementsSection supplements={results.supplements} />
          )}

          {/* Skincare Routine matin/soir */}
          {results.skincare && <SkincareRoutineSection skincare={results.skincare} />}

          {/* Rétention d'eau */}
          {results.water_retention && (
            <WaterRetentionSection wr={results.water_retention} />
          )}

          {/* Mewing */}
          {results.mewing && <MewingSection mewing={results.mewing} />}

          {/* Body fat objectif */}
          {results.body_fat_target && <BodyFatSection bft={results.body_fat_target} />}

          {/* Analyse par zone */}
          {results.facial_details && <FacialDetailsSection details={results.facial_details} />}

          {/* Sleep protocol */}
          {results.sleep_protocol && <SleepProtocolSection sleep={results.sleep_protocol} />}

          {/* Programme 7 jours */}
          {results.daily_program && (
            <DailyProgramSection program={results.daily_program} />
          )}

          {/* Recommended Products */}
          {results.recommended_products && results.recommended_products.length > 0 && (
            <RecommendedProductsSection products={results.recommended_products} />
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {profile?.plan === "monthly" ? (
              <Link
                href="/upload"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-semibold text-sm bg-[#e99846] text-[#0a0a0a] hover:bg-[#f0b060] transition-all hover:scale-105"
              >
                {t.results.analyzeAnother}
              </Link>
            ) : (
              <button
                onClick={() => setShowMonthlyModal(true)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-semibold text-sm border border-[#e99846]/60 text-[#e99846] bg-[#0a0a0a] hover:bg-[#e99846]/10 transition-all"
              >
                🔒 Analyses illimitées — Plan $9.99/mois
              </button>
            )}
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

          <div className="mt-6 text-center">
            <Link
              href="/progress"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm bg-[#e99846]/10 border border-[#e99846]/30 text-[#e99846] hover:bg-[#e99846]/20 transition-colors"
            >
              📈 Suivre ma progression →
            </Link>
          </div>

          <p className="mt-6 text-center text-xs text-white/20">{t.results.disclaimer}</p>
        </div>
      </main>
    );
  }

  // ── TEASER (free, pre-payment) ────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col">
      {Nav}

      {showUsedModal && (
        <UsedAnalysisModal
          onClose={() => { setShowUsedModal(false); setPayError(null); }}
          onPay={startCheckout}
          loading={checkoutLoading}
          error={payError}
        />
      )}

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
