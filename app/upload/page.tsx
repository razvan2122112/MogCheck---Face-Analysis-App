"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang, LangToggle } from "../context/language";

type DetectionStatus = "detecting" | "mapping" | "locked";

interface LiveMetrics {
  symmetry: number;
  canthal: number;
  jawGrade: string;
}

function getLandmarkColor(x: number): string {
  if (x < 0.46) return "#f97316";
  if (x > 0.54) return "#5fd0bf";
  return "rgba(255,255,255,0.75)";
}

function computeMetrics(
  lms: Array<{ x: number; y: number; z: number }>,
  cw: number,
  ch: number
): LiveMetrics {
  const noseTipX = lms[1].x;
  const pairs: [number, number][] = [
    [33, 263],
    [133, 362],
    [61, 291],
    [234, 454],
  ];
  const diffs = pairs.map(([l, r]) =>
    Math.abs(Math.abs(lms[l].x - noseTipX) - Math.abs(lms[r].x - noseTipX))
  );
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const symmetry = Math.max(0, Math.min(100, Math.round((1 - avgDiff * 8) * 100)));

  const rightTilt =
    (Math.atan2(
      (lms[133].y - lms[33].y) * ch,
      (lms[133].x - lms[33].x) * cw
    ) * 180) / Math.PI;
  const leftTilt =
    (Math.atan2(
      (lms[362].y - lms[263].y) * ch,
      (lms[263].x - lms[362].x) * cw
    ) * 180) / Math.PI;
  const canthal = parseFloat(((rightTilt + leftTilt) / 2).toFixed(1));

  const faceWidth = Math.abs(lms[454].x - lms[234].x) * cw;
  const faceHeight = Math.abs(lms[152].y - lms[10].y) * ch;
  const ratio = faceHeight > 0 ? faceWidth / faceHeight : 0;
  const jawGrade =
    ratio > 0.7 ? "A+" : ratio > 0.62 ? "A" : ratio > 0.55 ? "B" : ratio > 0.47 ? "C" : "D";

  return { symmetry, canthal, jawGrade };
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  lms: Array<{ x: number; y: number; z: number }>,
  cw: number,
  ch: number,
  revealCount: number,
  scanY: number,
  status: DetectionStatus
) {
  ctx.clearRect(0, 0, cw, ch);

  // Draw landmark dots up to revealCount
  const count = Math.min(revealCount, lms.length);
  for (let i = 0; i < count; i++) {
    const lm = lms[i];
    const x = lm.x * cw;
    const y = lm.y * ch;
    const color = getLandmarkColor(lm.x);
    const radius = status === "locked" ? 1.6 : 1.2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = status === "locked" ? 5 : 2;
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Compute bounding box from all landmarks
  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  for (const lm of lms) {
    if (lm.x < minX) minX = lm.x;
    if (lm.x > maxX) maxX = lm.x;
    if (lm.y < minY) minY = lm.y;
    if (lm.y > maxY) maxY = lm.y;
  }
  const pad = 0.025;
  const bx = Math.max(0, (minX - pad) * cw);
  const by = Math.max(0, (minY - pad) * ch);
  const bw = Math.min(cw - bx, (maxX - minX + pad * 2) * cw);
  const bh = Math.min(ch - by, (maxY - minY + pad * 2) * ch);
  const cl = Math.min(bw, bh) * 0.14;

  const bColor =
    status === "locked"
      ? "#5fd0bf"
      : status === "mapping"
      ? "#f97316"
      : "rgba(255,255,255,0.4)";
  ctx.strokeStyle = bColor;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.shadowColor = bColor;
  ctx.shadowBlur = 10;

  // Top-left corner
  ctx.beginPath(); ctx.moveTo(bx, by + cl); ctx.lineTo(bx, by); ctx.lineTo(bx + cl, by); ctx.stroke();
  // Top-right corner
  ctx.beginPath(); ctx.moveTo(bx + bw - cl, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cl); ctx.stroke();
  // Bottom-left corner
  ctx.beginPath(); ctx.moveTo(bx, by + bh - cl); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cl, by + bh); ctx.stroke();
  // Bottom-right corner
  ctx.beginPath(); ctx.moveTo(bx + bw - cl, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cl); ctx.stroke();

  ctx.shadowBlur = 0;

  // Scan line (only during detecting/mapping)
  if (status !== "locked") {
    const sy = by + (scanY / 100) * bh;
    const grad = ctx.createLinearGradient(bx, sy, bx + bw, sy);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(0.3, "rgba(94,208,191,0.08)");
    grad.addColorStop(0.5, "rgba(94,208,191,0.55)");
    grad.addColorStop(0.7, "rgba(94,208,191,0.08)");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(bx, sy - 2, bw, 4);
  }
}

const STATUS_CFG = {
  detecting: {
    label: "DETECTING",
    color: "rgba(255,255,255,0.35)",
    border: "rgba(255,255,255,0.1)",
    bg: "rgba(0,0,0,0.5)",
  },
  mapping: {
    label: "MAPPING",
    color: "#f97316",
    border: "rgba(249,115,22,0.3)",
    bg: "rgba(249,115,22,0.08)",
  },
  locked: {
    label: "LOCKED ✓",
    color: "#5fd0bf",
    border: "rgba(95,208,191,0.3)",
    bg: "rgba(95,208,191,0.08)",
  },
};

export default function UploadPage() {
  const router = useRouter();
  const { t } = useLang();
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faceMeshRef = useRef<any>(null);
  const rafRef = useRef<number>(0);

  // Detection refs — avoid stale closures inside RAF/callback
  const statusRef = useRef<DetectionStatus>("detecting");
  const landmarksRef = useRef<Array<{ x: number; y: number; z: number }> | null>(null);
  const revealCountRef = useRef(0);
  const mappingStartRef = useRef(0);
  const noFaceCountRef = useRef(0);
  const scanYRef = useRef(0);
  const scanDirRef = useRef(1);
  const lastFrameTsRef = useRef(0);
  const metricsRef = useRef<LiveMetrics | null>(null);

  // React state for UI
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>("detecting");
  const [revealCount, setRevealCount] = useState(0);
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  const handleResults = useCallback((results: { multiFaceLandmarks?: Array<Array<{ x: number; y: number; z: number }>> }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cw = canvas.width;
    const ch = canvas.height;
    if (cw === 0 || ch === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const lms = results.multiFaceLandmarks?.[0];

    if (!lms || lms.length < 10) {
      noFaceCountRef.current++;
      if (noFaceCountRef.current > 15) {
        statusRef.current = "detecting";
        revealCountRef.current = 0;
        landmarksRef.current = null;
        metricsRef.current = null;
        setDetectionStatus("detecting");
        setRevealCount(0);
        setMetrics(null);
      }
      ctx.clearRect(0, 0, cw, ch);
      return;
    }

    noFaceCountRef.current = 0;
    landmarksRef.current = lms;

    const now = performance.now();
    if (lastFrameTsRef.current === 0) lastFrameTsRef.current = now;
    const dt = now - lastFrameTsRef.current;
    lastFrameTsRef.current = now;

    // Status transitions
    if (statusRef.current === "detecting") {
      statusRef.current = "mapping";
      mappingStartRef.current = now;
      revealCountRef.current = 0;
      setDetectionStatus("mapping");
    }

    if (statusRef.current === "mapping") {
      const elapsed = now - mappingStartRef.current;
      const progress = Math.min(elapsed / 900, 1);
      revealCountRef.current = Math.round(progress * lms.length);
      setRevealCount(revealCountRef.current);
      if (progress >= 1) {
        statusRef.current = "locked";
        setDetectionStatus("locked");
      }
    }

    // Animate scan line
    if (statusRef.current !== "locked") {
      scanYRef.current += scanDirRef.current * dt * 0.08;
      if (scanYRef.current >= 100) { scanYRef.current = 100; scanDirRef.current = -1; }
      if (scanYRef.current <= 0) { scanYRef.current = 0; scanDirRef.current = 1; }
    }

    // Update metrics when locked
    if (statusRef.current === "locked") {
      const m = computeMetrics(lms, cw, ch);
      metricsRef.current = m;
      setMetrics(m);
    }

    drawOverlay(ctx, lms, cw, ch, revealCountRef.current, scanYRef.current, statusRef.current);
  }, []);

  const resetDetectionState = () => {
    statusRef.current = "detecting";
    revealCountRef.current = 0;
    landmarksRef.current = null;
    metricsRef.current = null;
    noFaceCountRef.current = 0;
    lastFrameTsRef.current = 0;
    scanYRef.current = 0;
    scanDirRef.current = 1;
    setDetectionStatus("detecting");
    setRevealCount(0);
    setMetrics(null);
  };

  const startCamera = async () => {
    setCameraLoading(true);
    setError(null);
    resetDetectionState();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      // Dynamic import — only runs in browser
      const { FaceMesh } = await import("@mediapipe/face_mesh");
      const faceMesh = new FaceMesh({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      faceMesh.onResults(handleResults);
      faceMeshRef.current = faceMesh;

      setCameraActive(true);
      setCameraLoading(false);

      // Attach stream to video
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // RAF loop: send frames to FaceMesh
      const loop = async () => {
        if (!streamRef.current?.active || !videoRef.current || !faceMeshRef.current) return;
        const vid = videoRef.current;
        if (vid.readyState >= 2 && vid.videoWidth > 0) {
          // Sync canvas size only when it changes (resizing clears canvas)
          if (canvasRef.current) {
            if (canvasRef.current.width !== vid.videoWidth) canvasRef.current.width = vid.videoWidth;
            if (canvasRef.current.height !== vid.videoHeight) canvasRef.current.height = vid.videoHeight;
          }
          try {
            await faceMeshRef.current.send({ image: vid });
          } catch {
            // Silently ignore send errors
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setError(t.upload.errCamera);
      setCameraLoading(false);
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
  };

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    faceMeshRef.current = null;
    resetDetectionState();
    setCameraActive(false);
  };

  const captureAndAnalyze = async () => {
    const video = videoRef.current;
    if (!video) return;
    setLoading(true);
    setError(null);

    // Capture current frame (mirrored like a selfie)
    const captureCanvas = document.createElement("canvas");
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;
    const ctx = captureCanvas.getContext("2d");
    if (ctx) {
      ctx.translate(captureCanvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
    }
    const base64 = captureCanvas.toDataURL("image/jpeg", 0.92);
    const lmMetrics = metricsRef.current;

    stopCamera();

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          mimeType: "image/jpeg",
          ...(lmMetrics && { landmarkMetrics: lmMetrics }),
        }),
      });

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg ?? t.upload.errAnalysisFailed);
      }

      const data = await res.json();
      sessionStorage.setItem("mogrank_results", JSON.stringify(data));
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.upload.errSomethingWrong);
      setLoading(false);
    }
  };

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) { setError(t.upload.errImageType); return; }
    if (f.size > 10 * 1024 * 1024) { setError(t.upload.errImageSize); return; }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
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
        throw new Error(msg ?? t.upload.errAnalysisFailed);
      }

      const data = await res.json();
      sessionStorage.setItem("mogrank_results", JSON.stringify(data));
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.upload.errSomethingWrong);
      setLoading(false);
    }
  };

  const sCfg = STATUS_CFG[detectionStatus];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="text-xl font-bold tracking-widest gold-text">
          MOGRANK
        </Link>
        <LangToggle className="flex items-center text-[11px] font-bold tracking-[0.08em] text-white/60 hover:text-white/90 transition-opacity" />
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <p className="text-xs uppercase tracking-[0.3em] text-[#e99846] mb-3 font-semibold">
          {t.upload.step}
        </p>
        <h1 className="text-3xl sm:text-4xl font-black text-center mb-3">{t.upload.title}</h1>
        <p className="text-white/40 text-center mb-10 max-w-sm">{t.upload.subtitle}</p>

        {/* Camera initializing skeleton */}
        {cameraLoading && (
          <div className="w-full max-w-md aspect-video rounded-3xl bg-black/50 border border-white/10 flex flex-col items-center justify-center gap-3 mb-6">
            <div className="w-8 h-8 border-2 border-[#5fd0bf] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono tracking-widest text-[#5fd0bf]/60 uppercase">
              Initializing...
            </span>
          </div>
        )}

        {/* Camera view */}
        {cameraActive && !cameraLoading && (
          <div className="relative w-full max-w-md mb-6">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-3xl block bg-black"
              style={{ transform: "scaleX(-1)" }}
            />
            {/* Landmark + bracket canvas — mirrored to match video */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full rounded-3xl pointer-events-none"
              style={{ transform: "scaleX(-1)" }}
            />

            {/* Analyzing overlay */}
            {loading && (
              <div className="absolute inset-0 rounded-3xl flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm z-20">
                <div className="w-8 h-8 border-2 border-[#e99846] border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-xs tracking-[0.2em] text-[#e99846] uppercase">
                  {t.upload.analyzing}
                </span>
              </div>
            )}

            {/* Status badge — top center */}
            {!loading && (
              <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none z-10">
                <span
                  className="px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-[0.15em] border transition-all duration-300"
                  style={{
                    color: sCfg.color,
                    borderColor: sCfg.border,
                    background: sCfg.bg,
                  }}
                >
                  {sCfg.label}
                </span>
              </div>
            )}

            {/* Real-time metrics — right side when locked */}
            {!loading && metrics && detectionStatus === "locked" && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 pointer-events-none z-10">
                {[
                  { label: "SYM", value: `${metrics.symmetry}%`, color: "#5fd0bf" },
                  {
                    label: "CANT",
                    value: `${metrics.canthal > 0 ? "+" : ""}${metrics.canthal}°`,
                    color: "#f97316",
                  },
                  { label: "JAW", value: metrics.jawGrade, color: "#e99846" },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="px-2 py-1.5 rounded-lg border text-center min-w-[52px]"
                    style={{ borderColor: `${color}30`, background: `${color}10` }}
                  >
                    <div
                      className="text-[8px] font-mono font-bold tracking-wider"
                      style={{ color: `${color}80` }}
                    >
                      {label}
                    </div>
                    <div className="text-xs font-mono font-bold" style={{ color }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Mapping progress counter — bottom-left */}
            {!loading && detectionStatus === "mapping" && (
              <div className="absolute bottom-[72px] left-4 pointer-events-none z-10">
                <span className="text-[9px] font-mono text-[#f97316]/60 tracking-widest">
                  {revealCount} / 468
                </span>
              </div>
            )}

            {/* Bottom controls */}
            {!loading && (
              <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-4 items-center z-10">
                <button
                  onClick={stopCamera}
                  className="px-5 py-2 rounded-full text-sm font-semibold border border-white/20 text-white/60 hover:text-white bg-black/60 transition-colors"
                >
                  {t.upload.cancel}
                </button>

                {detectionStatus === "locked" ? (
                  <button
                    onClick={captureAndAnalyze}
                    className="px-7 py-2.5 rounded-full font-bold text-sm bg-[#5fd0bf] text-[#0a0a0a] hover:bg-[#7de0cf] hover:scale-105 transition-all shadow-lg shadow-[#5fd0bf]/20"
                  >
                    ANALYZE →
                  </button>
                ) : (
                  // Disabled shutter while not locked
                  <div
                    className="w-14 h-14 rounded-full border-4 flex items-center justify-center opacity-25 cursor-not-allowed"
                    style={{ borderColor: sCfg.color }}
                  >
                    <div
                      className="w-9 h-9 rounded-full"
                      style={{ background: sCfg.color }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* File drop zone */}
        {!cameraActive && !cameraLoading && (
          <div
            onClick={() => !loading && inputRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const dropped = e.dataTransfer.files[0];
              if (dropped) handleFile(dropped);
            }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            className={`relative w-full max-w-md rounded-3xl border-2 border-dashed transition-all duration-200
              ${loading ? "cursor-default" : "cursor-pointer"}
              ${dragActive ? "border-[#e99846] bg-[#e99846]/8" : "border-white/15 hover:border-[#e99846]/50 bg-white/[0.02]"}
              ${preview ? "p-3" : "p-12"}
            `}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />

            {preview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Preview" className="w-full rounded-2xl object-cover max-h-80" />

                {loading && (
                  <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
                    <svg className="w-8 h-8 animate-spin text-[#e99846]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="font-mono text-[11px] tracking-[0.2em] text-[#e99846] uppercase">
                      {t.upload.analyzing}
                    </span>
                  </div>
                )}

                {!loading && (
                  <>
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
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl border border-white/10 flex items-center justify-center bg-white/5">
                  <svg
                    className="w-7 h-7 text-[#e99846]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-white/80">{t.upload.dropHere}</p>
                  <p className="text-sm text-white/35 mt-1">
                    or <span className="text-[#e99846]">{t.upload.clickBrowse}</span>
                  </p>
                </div>
                <p className="text-xs text-white/25">{t.upload.fileHint}</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-4 text-red-400 text-sm text-center max-w-md">{error}</p>
        )}

        {/* Analyze button (file upload mode) */}
        {!cameraActive && !cameraLoading && (
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
                {t.upload.analyzing}
              </span>
            ) : (
              t.upload.analyzeBtn
            )}
          </button>
        )}

        {/* Open camera button */}
        {!cameraActive && !cameraLoading && !loading && !file && (
          <button
            onClick={startCamera}
            className="mt-3 flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm border border-white/15 text-white/50 hover:text-white hover:border-white/30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
            {t.upload.useCamera}
          </button>
        )}

        {/* Tips */}
        {!cameraActive && !cameraLoading && !loading && (
          <div className="mt-12 max-w-md w-full grid grid-cols-3 gap-4">
            {[
              { icon: "☀", label: t.upload.tip1Label, sub: t.upload.tip1Sub },
              { icon: "👤", label: t.upload.tip2Label, sub: t.upload.tip2Sub },
              { icon: "😐", label: t.upload.tip3Label, sub: t.upload.tip3Sub },
            ].map((tip) => (
              <div
                key={tip.label}
                className="flex flex-col items-center text-center gap-1 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
              >
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
