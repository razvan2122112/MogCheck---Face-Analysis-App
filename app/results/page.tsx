"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface AnalysisResult {
  symmetry_score: number;
  jawline_score: number;
  canthal_tilt: number;
  midface_ratio: number;
  overall_score: number;
  improvements: string[];
  summary?: string;
}

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

function RatingLabel({ score }: { score: number }) {
  if (score >= 9) return <span className="text-[#4ade80]">Elite</span>;
  if (score >= 8) return <span className="text-[#86efac]">Very High</span>;
  if (score >= 7) return <span className="text-[#e99846]">Above Average</span>;
  if (score >= 6) return <span className="text-[#f0b060]">Average</span>;
  if (score >= 5) return <span className="text-[#fb923c]">Below Average</span>;
  return <span className="text-[#f87171]">Needs Work</span>;
}

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("mogcheck_results");
    if (!raw) {
      router.replace("/upload");
      return;
    }
    try {
      setResults(JSON.parse(raw));
      setLoaded(true);
    } catch {
      router.replace("/upload");
    }
  }, [router]);

  if (!loaded || !results) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#e99846] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const metrics = [
    { label: "Facial Symmetry", score: results.symmetry_score },
    { label: "Jawline Definition", score: results.jawline_score },
    { label: "Canthal Tilt", score: results.canthal_tilt },
    { label: "Midface Ratio", score: results.midface_ratio },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="text-xl font-bold tracking-widest gold-text">
          MOGCHECK
        </Link>
        <Link
          href="/upload"
          className="text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          ← New Analysis
        </Link>
      </nav>

      <div className="flex-1 w-full max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10 fade-up">
          <p className="text-xs uppercase tracking-[0.3em] text-[#e99846] mb-3 font-semibold">
            Your Results
          </p>
          <h1 className="text-4xl sm:text-5xl font-black mb-2">
            Overall Score
          </h1>

          {/* Big score circle */}
          <div className="flex justify-center my-8">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="#e99846"
                  strokeWidth="8"
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
            Rating: <RatingLabel score={results.overall_score} />
          </p>
          {results.summary && (
            <p className="text-white/40 text-sm mt-3 max-w-md mx-auto leading-relaxed">
              {results.summary}
            </p>
          )}
        </div>

        {/* Score breakdown */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 mb-6">
          <h2 className="font-bold text-sm uppercase tracking-widest text-white/40 mb-5">
            Metric Breakdown
          </h2>
          <div className="flex flex-col gap-5">
            {metrics.map((m, i) => (
              <ScoreBar key={m.label} label={m.label} score={m.score} delay={i * 120} />
            ))}
          </div>
        </div>

        {/* Improvements */}
        {results.improvements.length > 0 && (
          <div
            className="rounded-2xl border border-[#e99846]/15 bg-[#e99846]/5 p-6 mb-8 fade-up"
            style={{ animationDelay: "600ms", animationFillMode: "both" }}
          >
            <h2 className="font-bold text-sm uppercase tracking-widest text-[#e99846]/70 mb-4">
              Improvement Suggestions
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

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/upload"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-semibold text-sm bg-[#e99846] text-[#0a0a0a] hover:bg-[#f0b060] transition-all hover:scale-105"
          >
            Analyze Another Photo
          </Link>
          <button
            onClick={() => {
              const text = `My MogCheck results:\nOverall: ${results.overall_score.toFixed(1)}/10\nSymmetry: ${results.symmetry_score.toFixed(1)}\nJawline: ${results.jawline_score.toFixed(1)}\nCanthal Tilt: ${results.canthal_tilt.toFixed(1)}\nMidface: ${results.midface_ratio.toFixed(1)}`;
              navigator.clipboard.writeText(text);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-semibold text-sm border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors"
          >
            Copy Results
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-white/20">
          For entertainment purposes only. Results are AI-generated estimates, not medical assessments.
        </p>
      </div>
    </main>
  );
}
