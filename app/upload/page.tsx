"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type FaceApiModule = typeof import("@vladmandic/face-api");

const LANDMARKS = [
  { x: 50, y: 11 }, { x: 40, y: 12 }, { x: 60, y: 12 },
  { x: 24, y: 24 }, { x: 76, y: 24 },
  { x: 30, y: 27 }, { x: 40, y: 24 }, { x: 60, y: 24 }, { x: 70, y: 27 },
  { x: 34, y: 33 }, { x: 40, y: 31 }, { x: 46, y: 33 },
  { x: 54, y: 33 }, { x: 60, y: 31 }, { x: 66, y: 33 },
  { x: 50, y: 44 }, { x: 45, y: 51 }, { x: 50, y: 52 }, { x: 55, y: 51 },
  { x: 25, y: 48 }, { x: 75, y: 48 },
  { x: 37, y: 63 }, { x: 44, y: 61 }, { x: 50, y: 62 }, { x: 56, y: 61 }, { x: 63, y: 63 },
  { x: 44, y: 68 }, { x: 56, y: 68 }, { x: 50, y: 70 },
  { x: 20, y: 62 }, { x: 80, y: 62 },
  { x: 23, y: 72 }, { x: 77, y: 72 },
  { x: 33, y: 81 }, { x: 67, y: 81 }, { x: 50, y: 87 },
];

function drawFaceBox(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number },
  cw: number,
  ch: number
) {
  const pad = Math.min(box.width, box.height) * 0.08;
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  const bw = Math.min(cw - x, box.width + pad * 2);
  const bh = Math.min(ch - y, box.height + pad * 2);
  const c = Math.min(bw, bh) * 0.16;

  ctx.strokeStyle = "#00ff41";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.shadowColor = "#00ff41";
  ctx.shadowBlur = 10;

  ctx.beginPath(); ctx.moveTo(x, y + c); ctx.lineTo(x, y); ctx.lineTo(x + c, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + bw - c, y); ctx.lineTo(x + bw, y); ctx.lineTo(x + bw, y + c); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + bh - c); ctx.lineTo(x, y + bh); ctx.lineTo(x + c, y + bh); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + bw - c, y + bh); ctx.lineTo(x + bw, y + bh); ctx.lineTo(x + bw, y + bh - c); ctx.stroke();
}

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceApiRef = useRef<FaceApiModule | null>(null);
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [hudReady, setHudReady] = useState(false);

  useEffect(() => {
    return () => {
      if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      setScanProgress(0);
      setHudReady(false);
      return;
    }
    const hudTimer = setTimeout(() => setHudReady(true), 400);
    const start = Date.now();
    let rafId: number;
    const tick = () => {
      const pct = Math.min(92, Math.round(((Date.now() - start) / 8000) * 100));
      setScanProgress(pct);
      if (pct < 92) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      clearTimeout(hudTimer);
      cancelAnimationFrame(rafId);
    };
  }, [loading]);

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
    setPreview(URL.createObjectURL(f));
  };

  const runDetection = async (faceapi: FaceApiModule) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current?.active) return;

    if (video.videoWidth === 0 || video.paused) {
      detectTimerRef.current = setTimeout(() => runDetection(faceapi), 200);
      return;
    }

    try {
      const det = await faceapi.detectSingleFace(
        video,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
      );
      if (streamRef.current?.active) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (det) {
            drawFaceBox(ctx, det.box, canvas.width, canvas.height);
            setFaceDetected(true);
          } else {
            setFaceDetected(false);
          }
        }
      }
    } catch {
      // silently ignore detection errors
    }

    if (streamRef.current?.active) {
      detectTimerRef.current = setTimeout(() => runDetection(faceapi), 100);
    }
  };

  const startFaceDetection = async () => {
    try {
      if (!faceApiRef.current) {
        const faceapi = await import("@vladmandic/face-api");
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        faceApiRef.current = faceapi;
      }
      runDetection(faceApiRef.current);
    } catch (e) {
      console.warn("Face detection unavailable:", e);
    }
  };

  const stopFaceDetection = () => {
    if (detectTimerRef.current) {
      clearTimeout(detectTimerRef.current);
      detectTimerRef.current = null;
    }
    setFaceDetected(false);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const openCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current
            .play()
            .then(() => startFaceDetection())
            .catch(() => startFaceDetection());
        }
      }, 50);
    } catch {
      setError("Camera access denied. Please allow camera permissions and try again.");
    }
  };

  const stopCamera = () => {
    stopFaceDetection();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
    }
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        handleFile(new File([blob], "camera-capture.jpg", { type: "image/jpeg" }));
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
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
      sessionStorage.setItem("mogcheck_results", JSON.stringify(data));
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="text-xl font-bold tracking-widest gold-text">
          MOGCHECK
        </Link>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <p className="text-xs uppercase tracking-[0.3em] text-[#e99846] mb-3 font-semibold">Step 1</p>
        <h1 className="text-3xl sm:text-4xl font-black text-center mb-3">Upload Your Photo</h1>
        <p className="text-white/40 text-center mb-10 max-w-sm">
          Use a front-facing photo in good lighting. No hats, sunglasses, or heavy filters.
        </p>

        {/* Camera view */}
        {cameraActive && (
          <div className="relative w-full max-w-md rounded-3xl overflow-hidden bg-black mb-6">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-3xl block"
              style={{ transform: "scaleX(-1)" }}
            />
            {/* detection canvas — same CSS mirror as video so coordinates align */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full rounded-3xl pointer-events-none"
              style={{ transform: "scaleX(-1)" }}
            />
            {/* gold corner brackets */}
            {(["top-3 left-3 border-t-2 border-l-2", "top-3 right-3 border-t-2 border-r-2",
               "bottom-16 left-3 border-b-2 border-l-2", "bottom-16 right-3 border-b-2 border-r-2"] as const).map((cls, i) => (
              <div key={i} className={`absolute w-6 h-6 border-[#e99846] ${cls} pointer-events-none`} />
            ))}
            {/* face detection status badge */}
            <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none">
              <span className={`px-3 py-1 rounded-full text-[10px] font-mono tracking-widest border transition-all duration-300 ${
                faceDetected
                  ? "bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/30"
                  : "bg-black/40 text-white/30 border-white/10"
              }`}>
                {faceDetected ? "✓ FACE DETECTED" : "ALIGN YOUR FACE"}
              </span>
            </div>
            {/* capture + cancel */}
            <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-4 items-center">
              <button
                onClick={stopCamera}
                className="px-5 py-2 rounded-full text-sm font-semibold border border-white/20 text-white/60 hover:text-white bg-black/60 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="w-14 h-14 rounded-full border-4 border-[#e99846] bg-white/10 hover:bg-[#e99846]/30 transition-colors flex items-center justify-center"
                aria-label="Take photo"
              >
                <div className="w-9 h-9 rounded-full bg-[#e99846]" />
              </button>
            </div>
          </div>
        )}

        {/* Drop zone */}
        {!cameraActive && (
          <div
            onClick={() => !loading && inputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={() => setDragActive(false)}
            className={`relative w-full max-w-md rounded-3xl border-2 border-dashed transition-all duration-200
              ${loading ? "cursor-default" : "cursor-pointer"}
              ${dragActive ? "border-[#e99846] bg-[#e99846]/8" : "border-white/15 hover:border-[#e99846]/50 bg-white/[0.02]"}
              ${preview ? "p-3" : "p-12"}
            `}
          >
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const picked = e.target.files?.[0];
              if (picked) handleFile(picked);
            }} />

            {preview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Preview" className="w-full rounded-2xl object-cover max-h-80" />

                {/* scan overlay */}
                {loading && (
                  <div className="absolute inset-0 rounded-2xl overflow-hidden scan-overlay-bg">
                    <div className="absolute inset-0 scan-grid" />
                    <div className="absolute left-0 right-0 scan-sweep" />
                    {(["top-2 left-2 border-t-2 border-l-2", "top-2 right-2 border-t-2 border-r-2",
                       "bottom-2 left-2 border-b-2 border-l-2", "bottom-2 right-2 border-b-2 border-r-2"] as const).map((cls, i) => (
                      <div key={i} className={`absolute w-5 h-5 border-[#00ff41] ${cls}`} />
                    ))}
                    <div className="absolute top-[8%] left-[28%] right-[28%] bottom-[10%] border border-[#00ff41]/20 rounded-full pointer-events-none" />
                    {LANDMARKS.map((pt, i) => (
                      <div key={i} className="landmark-dot absolute w-1 h-1 rounded-full bg-[#00ff41]"
                        style={{ left: `${pt.x}%`, top: `${pt.y}%`, animationDelay: `${i * 45}ms` }} />
                    ))}
                    <div className="absolute top-2 left-0 right-0 flex justify-center">
                      <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-[#00ff41] uppercase">
                        <span className="hud-blink">●</span> Scanning Biometrics
                      </span>
                    </div>
                    <div className="hud-fade-left absolute left-2 top-[28%] flex flex-col gap-2"
                      style={{ animationDelay: hudReady ? "0ms" : "9999s" }}>
                      {[{ label: "SYMMETRY", pct: 72 }, { label: "JAWLINE", pct: 85 }].map((m) => (
                        <div key={m.label} className="flex flex-col gap-0.5">
                          <span className="font-mono text-[8px] tracking-[0.15em] text-[#00ff41]/70 uppercase">{m.label}</span>
                          <div className="w-16 h-1 rounded-full bg-[#00ff41]/15 overflow-hidden">
                            <div className="h-full rounded-full bg-[#00ff41] transition-all duration-1000 ease-out"
                              style={{ width: hudReady ? `${m.pct}%` : "0%" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="hud-fade-right absolute right-2 top-[28%] flex flex-col gap-2 items-end"
                      style={{ animationDelay: hudReady ? "0ms" : "9999s" }}>
                      {[{ label: "CANTHAL", pct: 68 }, { label: "MIDFACE", pct: 79 }].map((m) => (
                        <div key={m.label} className="flex flex-col gap-0.5 items-end">
                          <span className="font-mono text-[8px] tracking-[0.15em] text-[#00ff41]/70 uppercase">{m.label}</span>
                          <div className="w-16 h-1 rounded-full bg-[#00ff41]/15 overflow-hidden">
                            <div className="h-full rounded-full bg-[#00ff41] transition-all duration-1000 ease-out"
                              style={{ width: hudReady ? `${m.pct}%` : "0%" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="absolute bottom-2 left-3 right-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-mono text-[9px] tracking-[0.2em] text-[#00ff41]/70 uppercase">Processing</span>
                        <span className="font-mono text-[9px] text-[#00ff41]">{scanProgress}%</span>
                      </div>
                      <div className="h-0.5 w-full rounded-full bg-[#00ff41]/15 overflow-hidden">
                        <div className="h-full rounded-full bg-[#00ff41] transition-all duration-200 ease-linear"
                          style={{ width: `${scanProgress}%` }} />
                      </div>
                    </div>
                  </div>
                )}

                {!loading && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); setError(null); }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors text-sm"
                    >
                      ✕
                    </button>
                    <p className="text-center text-xs text-white/40 mt-3 mb-1">
                      {file?.name} · {((file?.size ?? 0) / 1024).toFixed(0)} KB
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl border border-white/10 flex items-center justify-center bg-white/5">
                  <svg className="w-7 h-7 text-[#e99846]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-white/80">Drop your photo here</p>
                  <p className="text-sm text-white/35 mt-1">or <span className="text-[#e99846]">click to browse</span></p>
                </div>
                <p className="text-xs text-white/25">JPG, PNG, WEBP · Max 10 MB</p>
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-red-400 text-sm text-center max-w-md">{error}</p>}

        <button
          onClick={handleAnalyze}
          disabled={!file || loading}
          className={`mt-8 px-10 py-4 rounded-full font-bold text-base transition-all duration-200
            ${file && !loading
              ? "bg-[#e99846] text-[#0a0a0a] hover:bg-[#f0b060] hover:scale-105 shadow-lg shadow-[#e99846]/20"
              : "bg-white/10 text-white/30 cursor-not-allowed"
            }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
              </svg>
              Analyzing…
            </span>
          ) : "Analyze My Face →"}
        </button>

        {!file && !loading && !cameraActive && (
          <button
            onClick={openCamera}
            className="mt-3 flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm border border-white/15 text-white/50 hover:text-white hover:border-white/30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
            Use Camera
          </button>
        )}

        {!cameraActive && !loading && (
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
        )}
      </div>
    </main>
  );
}
