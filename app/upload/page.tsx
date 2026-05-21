"use client";

import { useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, WEBP).");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("Image must be under 10 MB.");
      return;
    }
    setError(null);
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, []);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => setDragActive(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) handleFile(picked);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      });

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg ?? "Analysis failed.");
      }

      const data = await res.json();
      // Store results in sessionStorage and navigate
      sessionStorage.setItem("mogcheck_results", JSON.stringify(data));
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="text-xl font-bold tracking-widest gold-text">
          MOGCHECK
        </Link>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <p className="text-xs uppercase tracking-[0.3em] text-[#e99846] mb-3 font-semibold">
          Step 1
        </p>
        <h1 className="text-3xl sm:text-4xl font-black text-center mb-3">
          Upload Your Photo
        </h1>
        <p className="text-white/40 text-center mb-10 max-w-sm">
          Use a front-facing photo in good lighting. No hats, sunglasses, or heavy filters.
        </p>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`relative w-full max-w-md rounded-3xl border-2 border-dashed transition-all duration-200 cursor-pointer
            ${dragActive ? "border-[#e99846] bg-[#e99846]/8" : "border-white/15 hover:border-[#e99846]/50 bg-white/[0.02]"}
            ${preview ? "p-3" : "p-12"}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onInputChange}
          />

          {preview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Preview"
                className="w-full rounded-2xl object-cover max-h-80"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setPreview(null);
                  setError(null);
                }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors text-sm"
              >
                ✕
              </button>
              <p className="text-center text-xs text-white/40 mt-3 mb-1">
                {file?.name} · {((file?.size ?? 0) / 1024).toFixed(0)} KB
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl border border-white/10 flex items-center justify-center bg-white/5">
                <svg className="w-7 h-7 text-[#e99846]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white/80">
                  Drop your photo here
                </p>
                <p className="text-sm text-white/35 mt-1">
                  or <span className="text-[#e99846]">click to browse</span>
                </p>
              </div>
              <p className="text-xs text-white/25">JPG, PNG, WEBP · Max 10 MB</p>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-4 text-red-400 text-sm text-center max-w-md">{error}</p>
        )}

        <button
          onClick={handleAnalyze}
          disabled={!file || loading}
          className={`mt-8 px-10 py-4 rounded-full font-bold text-base transition-all duration-200
            ${file && !loading
              ? "bg-[#e99846] text-[#0a0a0a] hover:bg-[#f0b060] hover:scale-105 shadow-lg shadow-[#e99846]/20"
              : "bg-white/10 text-white/30 cursor-not-allowed"
            }
          `}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
              </svg>
              Analyzing…
            </span>
          ) : (
            "Analyze My Face →"
          )}
        </button>

        {/* Tips */}
        <div className="mt-12 max-w-md w-full grid grid-cols-3 gap-4">
          {[
            { icon: "☀", label: "Good lighting", sub: "Natural or front-lit" },
            { icon: "👤", label: "Face forward", sub: "Direct camera angle" },
            { icon: "😐", label: "Neutral expression", sub: "Relaxed, mouth closed" },
          ].map((tip) => (
            <div key={tip.label} className="flex flex-col items-center text-center gap-1 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-xl">{tip.icon}</span>
              <span className="text-xs font-semibold text-white/70">{tip.label}</span>
              <span className="text-xs text-white/30">{tip.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
