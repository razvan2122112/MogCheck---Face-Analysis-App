"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen bg-[#0a0a0a] text-[#ededed] overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 backdrop-blur-md bg-[#0a0a0a]/80">
        <span className="text-xl font-bold tracking-widest gold-text">MOGCHECK</span>
        <Link
          href="/upload"
          className="px-5 py-2 rounded-full text-sm font-semibold bg-[#e99846] text-[#0a0a0a] hover:bg-[#f0b060] transition-colors"
        >
          Analyze Now
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-40 pb-28">
        {/* Background radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 20%, rgba(233,152,70,0.12) 0%, transparent 70%)",
          }}
        />

        <p className="text-xs uppercase tracking-[0.3em] text-[#e99846] mb-4 font-semibold">
          AI-Powered Facial Analysis
        </p>
        <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-none mb-6">
          Discover Your{" "}
          <span className="gold-text">True Rating</span>
        </h1>
        <p className="max-w-xl text-lg text-white/50 mb-10 leading-relaxed">
          Upload a photo. Our AI analyzes symmetry, jawline, canthal tilt, and
          midface ratio — giving you an honest aesthetic breakdown in seconds.
        </p>
        <Link
          href="/upload"
          className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-bold bg-[#e99846] text-[#0a0a0a] hover:bg-[#f0b060] transition-all duration-200 shadow-lg shadow-[#e99846]/20 hover:shadow-[#e99846]/40 hover:scale-105"
        >
          Get Your Score
          <svg
            className="w-4 h-4 transition-transform group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Link>

        {/* Social proof */}
        <p className="mt-8 text-sm text-white/30">
          <span className="text-[#e99846] font-semibold">10,000+</span> faces analyzed
        </p>
      </section>

      {/* Metrics grid */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Symmetry Score", icon: "◈", desc: "Left-right facial balance" },
            { label: "Jawline", icon: "◻", desc: "Definition & angularity" },
            { label: "Canthal Tilt", icon: "◤", desc: "Eye angle & hunter eyes" },
            { label: "Midface Ratio", icon: "⊞", desc: "Golden ratio alignment" },
          ].map((m) => (
            <div
              key={m.label}
              className="flex flex-col gap-3 p-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:border-[#e99846]/30 transition-colors"
            >
              <span className="text-2xl text-[#e99846]">{m.icon}</span>
              <span className="font-semibold text-sm text-white/90">{m.label}</span>
              <span className="text-xs text-white/40">{m.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-28">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs uppercase tracking-[0.3em] text-[#e99846] text-center mb-3 font-semibold">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-14">
            Three Steps to Your Rating
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Upload a Photo",
                desc: "Use a clear, front-facing photo in good lighting. No filters.",
              },
              {
                step: "02",
                title: "AI Analysis",
                desc: "Claude AI measures 6 key facial metrics against aesthetic standards.",
              },
              {
                step: "03",
                title: "Get Your Report",
                desc: "Receive a detailed score breakdown with actionable improvements.",
              },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="text-6xl font-black text-white/5 absolute -top-3 -left-1 select-none">
                  {s.step}
                </div>
                <div className="pt-8 pl-2">
                  <h3 className="font-bold text-lg mb-2 text-white/90">{s.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto rounded-3xl border border-[#e99846]/20 bg-gradient-to-br from-[#e99846]/10 to-transparent p-12 text-center gold-glow">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Ready to Find Out?
          </h2>
          <p className="text-white/50 mb-8 max-w-md mx-auto">
            Upload your photo now — it takes under 30 seconds to get your full
            aesthetic analysis.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-bold bg-[#e99846] text-[#0a0a0a] hover:bg-[#f0b060] transition-all duration-200 hover:scale-105"
          >
            Analyze My Face
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/5 px-6 py-8 text-center text-xs text-white/25">
        <p className="tracking-widest font-bold text-white/40 mb-2">MOGCHECK</p>
        <p>For entertainment and self-improvement purposes only. Not medical advice.</p>
      </footer>
    </main>
  );
}
