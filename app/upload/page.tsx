"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang, LangToggle } from "../context/language";

type AngleId = "front" | "left" | "right";
type DetectionStatus = "detecting" | "mapping" | "locked";

interface LiveMetrics {
  symmetry: number;
  canthal: number;
  jawGrade: string;
}

function FaceGuide({ angleId }: { angleId: AngleId }) {
  if (angleId === "front") {
    return (
      <svg viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <ellipse cx="60" cy="75" rx="42" ry="55" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
        <ellipse cx="43" cy="58" rx="9" ry="5" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <ellipse cx="77" cy="58" rx="9" ry="5" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <path d="M60 65 L56 80 Q60 83 64 80 L60 65Z" stroke="currentColor" strokeWidth="1" opacity="0.3" fill="none" />
        <path d="M48 96 Q60 103 72 96" stroke="currentColor" strokeWidth="1" opacity="0.3" fill="none" />
        <circle cx="60" cy="128" r="1.5" fill="currentColor" opacity="0.3" />
      </svg>
    );
  }
  if (angleId === "left") {
    return (
      <svg viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <ellipse cx="55" cy="75" rx="35" ry="55" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" transform="rotate(-10, 55, 75)" />
        <ellipse cx="46" cy="60" rx="8" ry="4.5" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <path d="M64 65 L70 80 Q66 83 61 80" stroke="currentColor" strokeWidth="1" opacity="0.3" fill="none" />
        <circle cx="52" cy="128" r="1.5" fill="currentColor" opacity="0.3" />
        <path d="M95 75 L80 75 M80 75 L86 69 M80 75 L86 81" stroke="currentColor" strokeWidth="1.5" opacity="0.35" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" style={{ transform: "scaleX(-1)" }}>
      <ellipse cx="55" cy="75" rx="35" ry="55" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" transform="rotate(-10, 55, 75)" />
      <ellipse cx="46" cy="60" rx="8" ry="4.5" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <path d="M64 65 L70 80 Q66 83 61 80" stroke="currentColor" strokeWidth="1" opacity="0.3" fill="none" />
      <circle cx="52" cy="128" r="1.5" fill="currentColor" opacity="0.3" />
      <path d="M95 75 L80 75 M80 75 L86 69 M80 75 L86 81" stroke="currentColor" strokeWidth="1.5" opacity="0.35" strokeLinecap="round" />
    </svg>
  );
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
  const pairs: [number, number][] = [[33, 263], [133, 362], [61, 291], [234, 454]];
  const diffs = pairs.map(([l, r]) =>
    Math.abs(Math.abs(lms[l].x - noseTipX) - Math.abs(lms[r].x - noseTipX))
  );
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const symmetry = Math.max(0, Math.min(100, Math.round((1 - avgDiff * 8) * 100)));

  const rightTilt =
    (Math.atan2((lms[133].y - lms[33].y) * ch, (lms[133].x - lms[33].x) * cw) * 180) / Math.PI;
  const leftTilt =
    (Math.atan2((lms[362].y - lms[263].y) * ch, (lms[263].x - lms[362].x) * cw) * 180) / Math.PI;
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
    status === "locked" ? "#5fd0bf" : status === "mapping" ? "#f97316" : "rgba(255,255,255,0.4)";
  ctx.strokeStyle = bColor;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.shadowColor = bColor;
  ctx.shadowBlur = 10;

  ctx.beginPath(); ctx.moveTo(bx, by + cl); ctx.lineTo(bx, by); ctx.lineTo(bx + cl, by); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx + bw - cl, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cl); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx, by + bh - cl); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cl, by + bh); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx + bw - cl, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cl); ctx.stroke();
  ctx.shadowBlur = 0;

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
  const { t, lang } = useLang();
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

  // React state
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>("detecting");
  const [revealCount, setRevealCount] = useState(0);
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [modalAngle, setModalAngle] = useState<AngleId | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<Partial<Record<AngleId, string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ANGLES: Array<{ id: AngleId; label: string; sublabel: string; instruction: string }> = [
    {
      id: "front",
      label: t.upload.angleFront,
      sublabel: t.upload.angleFrontSub,
      instruction: t.upload.cameraInstructFront,
    },
    {
      id: "left",
      label: t.upload.angleLeft,
      sublabel: t.upload.angleLeftSub,
      instruction: t.upload.cameraInstructLeft,
    },
    {
      id: "right",
      label: t.upload.angleRight,
      sublabel: t.upload.angleRightSub,
      instruction: t.upload.cameraInstructRight,
    },
  ];

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  const handleResults = useCallback(
    (results: { multiFaceLandmarks?: Array<Array<{ x: number; y: number; z: number }>> }) => {
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

      if (statusRef.current !== "locked") {
        scanYRef.current += scanDirRef.current * dt * 0.08;
        if (scanYRef.current >= 100) { scanYRef.current = 100; scanDirRef.current = -1; }
        if (scanYRef.current <= 0) { scanYRef.current = 0; scanDirRef.current = 1; }
      }

      if (statusRef.current === "locked") {
        const m = computeMetrics(lms, cw, ch);
        metricsRef.current = m;
        setMetrics(m);
      }

      drawOverlay(ctx, lms, cw, ch, revealCountRef.current, scanYRef.current, statusRef.current);
    },
    []
  );

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

  const openCameraForAngle = async (angleId: AngleId) => {
    setModalAngle(angleId);
    setCameraLoading(true);
    setError(null);
    resetDetectionState();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

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

      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      const loop = async () => {
        if (!streamRef.current?.active || !videoRef.current || !faceMeshRef.current) return;
        const vid = videoRef.current;
        if (vid.readyState >= 2 && vid.videoWidth > 0) {
          if (canvasRef.current) {
            if (canvasRef.current.width !== vid.videoWidth) canvasRef.current.width = vid.videoWidth;
            if (canvasRef.current.height !== vid.videoHeight) canvasRef.current.height = vid.videoHeight;
          }
          try {
            await faceMeshRef.current.send({ image: vid });
          } catch {
            // ignore frame send errors
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setError(t.upload.errCamera);
      setCameraLoading(false);
      setCameraActive(false);
      setModalAngle(null);
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
    setCameraLoading(false);
    setModalAngle(null);
  };

  const captureForAngle = (angleId: AngleId) => {
    const video = videoRef.current;
    if (!video) return;

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

    // Store downscaled front photo for before/after slider
    if (angleId === "front") {
      const photoRatio = Math.min(1, 640 / captureCanvas.width);
      const photoCanvas = document.createElement("canvas");
      photoCanvas.width = Math.round(captureCanvas.width * photoRatio);
      photoCanvas.height = Math.round(captureCanvas.height * photoRatio);
      photoCanvas.getContext("2d")?.drawImage(captureCanvas, 0, 0, photoCanvas.width, photoCanvas.height);
      sessionStorage.setItem("mogrank_photo", photoCanvas.toDataURL("image/jpeg", 0.82));
    }

    setCapturedPhotos((prev) => ({ ...prev, [angleId]: base64 }));
    stopCamera();
  };

  const handleAnalyze = async () => {
    const photos = capturedPhotos as Record<AngleId, string>;
    if (!photos.front || !photos.left || !photos.right) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: [photos.front, photos.left, photos.right],
          mimeType: "image/jpeg",
          lang,
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

  const allCaptured = ANGLES.every((a) => capturedPhotos[a.id]);
  const sCfg = STATUS_CFG[detectionStatus];
  const activeAngle = ANGLES.find((a) => a.id === modalAngle);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="text-xl font-bold tracking-widest gold-text">
          MOGRANK
        </Link>
        <LangToggle className="flex items-center text-[11px] font-bold tracking-[0.08em] text-white/60 hover:text-white/90 transition-opacity" />
      </nav>

      <div className="flex-1 flex flex-col items-center px-6 py-12">
        <p className="text-xs uppercase tracking-[0.3em] text-[#e99846] mb-3 font-semibold">
          {t.upload.step}
        </p>
        <h1 className="text-3xl sm:text-4xl font-black text-center mb-3">
          {t.upload.multiTitle}
        </h1>
        <p className="text-white/40 text-center mb-10 max-w-sm">{t.upload.multiSubtitle}</p>

        {/* 3-angle capture grid */}
        <div className="w-full max-w-xl grid grid-cols-3 gap-4 mb-10">
          {ANGLES.map((angle, idx) => {
            const captured = capturedPhotos[angle.id];
            return (
              <div key={angle.id} className="flex flex-col items-center gap-2">
                {/* Step indicator */}
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                      captured
                        ? "bg-[#5fd0bf] text-[#0a0a0a]"
                        : "bg-white/10 text-white/40"
                    }`}
                  >
                    {captured ? "✓" : idx + 1}
                  </div>
                  <span className="text-xs font-semibold text-white/70">{angle.label}</span>
                </div>

                {/* Photo slot */}
                <div
                  className={`relative w-full rounded-2xl border-2 overflow-hidden transition-all duration-200 ${
                    captured
                      ? "border-[#5fd0bf]/50 aspect-[3/4]"
                      : "border-dashed border-white/15 hover:border-[#e99846]/50 cursor-pointer aspect-[3/4] bg-white/[0.02]"
                  }`}
                  onClick={() => !captured && !loading && openCameraForAngle(angle.id)}
                >
                  {captured ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={captured}
                        alt={angle.label}
                        className="w-full h-full object-cover"
                      />
                      {/* Captured overlay */}
                      <div className="absolute inset-0 bg-[#5fd0bf]/10 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-[#5fd0bf] flex items-center justify-center shadow-lg">
                          <svg className="w-4 h-4 text-[#0a0a0a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      {/* Retake button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCapturedPhotos((prev) => {
                            const copy = { ...prev };
                            delete copy[angle.id];
                            return copy;
                          });
                        }}
                        className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-bold bg-black/70 text-white/70 hover:text-white border border-white/20 whitespace-nowrap transition-colors"
                      >
                        {t.upload.retakeBtn}
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-2">
                      {/* Face guide SVG */}
                      <div className="w-12 h-16 text-[#e99846]/50">
                        <FaceGuide angleId={angle.id} />
                      </div>
                      {/* Camera icon */}
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full border border-[#e99846]/25 text-[#e99846]/50">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0Z" />
                        </svg>
                        <span className="text-[9px] font-bold">{t.upload.captureBtn}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sublabel */}
                <p className="text-[9px] text-white/30 text-center leading-tight px-1">
                  {angle.sublabel}
                </p>
              </div>
            );
          })}
        </div>

        {/* Analyze button */}
        <button
          onClick={handleAnalyze}
          disabled={!allCaptured || loading}
          className={`px-10 py-4 rounded-full font-bold text-base transition-all duration-200 ${
            allCaptured && !loading
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
            t.upload.analyseBtn
          )}
        </button>

        {error && (
          <p className="mt-4 text-red-400 text-sm text-center max-w-md">{error}</p>
        )}

        {/* Progress hint when not all captured */}
        {!allCaptured && !loading && (
          <p className="mt-3 text-xs text-white/25 text-center">
            {ANGLES.filter((a) => capturedPhotos[a.id]).length} / 3
          </p>
        )}
      </div>

      {/* Camera modal */}
      {modalAngle && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Header */}
          <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#e99846]/80 font-mono font-bold">
                {activeAngle?.label}
              </p>
              <p className="text-sm text-white/55 mt-0.5">{activeAngle?.instruction}</p>
            </div>
            <button
              onClick={stopCamera}
              className="px-4 py-2 rounded-full text-sm font-semibold border border-white/20 text-white/60 hover:text-white transition-colors"
            >
              {t.upload.cancel}
            </button>
          </div>

          {/* Camera loading */}
          {cameraLoading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-2 border-[#5fd0bf] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono tracking-widest text-[#5fd0bf]/60 uppercase">
                Initializing…
              </span>
            </div>
          )}

          {/* Live camera view */}
          {cameraActive && !cameraLoading && (
            <>
              <div className="flex-1 relative overflow-hidden">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />

                {/* Face guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-44 h-56 opacity-25" style={{ color: "#e99846" }}>
                    <FaceGuide angleId={modalAngle} />
                  </div>
                </div>

                {/* Landmark canvas */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ transform: "scaleX(-1)" }}
                />

                {/* Status badge */}
                <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
                  <span
                    className="px-4 py-1.5 rounded-full text-[11px] font-mono font-bold tracking-[0.15em] border transition-all duration-300"
                    style={{
                      color: sCfg.color,
                      borderColor: sCfg.border,
                      background: sCfg.bg,
                    }}
                  >
                    {sCfg.label}
                  </span>
                </div>

                {/* Mapping counter */}
                {detectionStatus === "mapping" && (
                  <div className="absolute bottom-4 left-4 pointer-events-none">
                    <span className="text-[9px] font-mono text-[#f97316]/60 tracking-widest">
                      {revealCount} / 468
                    </span>
                  </div>
                )}

                {/* Real-time metrics */}
                {metrics && detectionStatus === "locked" && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 pointer-events-none">
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
              </div>

              {/* Capture button bar */}
              <div className="flex-none px-6 py-6 flex justify-center border-t border-white/10">
                {detectionStatus === "locked" ? (
                  <button
                    onClick={() => captureForAngle(modalAngle)}
                    className="px-12 py-4 rounded-full font-bold text-base bg-[#5fd0bf] text-[#0a0a0a] hover:bg-[#7de0cf] hover:scale-105 transition-all shadow-lg shadow-[#5fd0bf]/20"
                  >
                    {t.upload.captureBtn} →
                  </button>
                ) : (
                  <div className="px-12 py-4 rounded-full font-bold text-base bg-white/8 text-white/25 cursor-not-allowed border border-white/10">
                    {t.upload.captureBtn}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
