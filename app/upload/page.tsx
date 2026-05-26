"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang, LangToggle } from "../context/language";
import { useAuth } from "../context/auth";
import { getBrowserClient } from "@/lib/supabase";

type AngleId = "front" | "left" | "right";
type DetectionStatus = "detecting" | "mapping" | "locked";
type Phase = "idle" | "camera" | "preview";

interface LiveMetrics {
  symmetry: number;
  canthal: number;
  jawGrade: string;
}

// ─── constants ───────────────────────────────────────────────────────────────

const HOLD_MS = 1200;
const STEP_ANGLE_IDS: AngleId[] = ["front", "left", "right"];

// Yaw thresholds (positive yaw = face turned left in selfie mirror view)
const STEP_YAW = [
  { min: -0.10, max: 0.10 },      // front: nose near face center
  { min: 0.18, max: Infinity },   // left: nose shifted right in raw frame
  { min: -Infinity, max: -0.18 }, // right: nose shifted left in raw frame
];

function inPosition(yaw: number, step: number): boolean {
  const t = STEP_YAW[step];
  return !!t && yaw >= t.min && yaw <= t.max;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Yaw: positive = user turned left (selfie mirror convention). */
function computeYaw(lms: Array<{ x: number; y: number; z: number }>): number {
  const noseX = lms[1].x;
  const faceCenter = (lms[234].x + lms[454].x) / 2;
  const faceWidth = Math.abs(lms[454].x - lms[234].x);
  if (faceWidth < 0.01) return 0;
  return (noseX - faceCenter) / faceWidth;
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

function getLandmarkColor(x: number): string {
  if (x < 0.46) return "#f97316";
  if (x > 0.54) return "#5fd0bf";
  return "rgba(255,255,255,0.75)";
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
    const color = getLandmarkColor(lm.x);
    const radius = status === "locked" ? 1.6 : 1.2;
    ctx.beginPath();
    ctx.arc(lm.x * cw, lm.y * ch, radius, 0, Math.PI * 2);
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
    grad.addColorStop(0.5, "rgba(94,208,191,0.55)");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(bx, sy - 2, bw, 4);
  }
}

function playBeep() {
  try {
    const ac = new AudioContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.25, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.18);
  } catch { /* ignore if audio blocked */ }
}

// ─── Face guide SVGs ──────────────────────────────────────────────────────────

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
        <ellipse cx="55" cy="75" rx="35" ry="55" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" transform="rotate(-10 55 75)" />
        <ellipse cx="46" cy="60" rx="8" ry="4.5" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <path d="M64 65 L70 80 Q66 83 61 80" stroke="currentColor" strokeWidth="1" opacity="0.3" fill="none" />
        <circle cx="52" cy="128" r="1.5" fill="currentColor" opacity="0.3" />
        <path d="M95 75 L80 75 M80 75 L86 69 M80 75 L86 81" stroke="currentColor" strokeWidth="1.5" opacity="0.35" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" style={{ transform: "scaleX(-1)" }}>
      <ellipse cx="55" cy="75" rx="35" ry="55" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" transform="rotate(-10 55 75)" />
      <ellipse cx="46" cy="60" rx="8" ry="4.5" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <path d="M64 65 L70 80 Q66 83 61 80" stroke="currentColor" strokeWidth="1" opacity="0.3" fill="none" />
      <circle cx="52" cy="128" r="1.5" fill="currentColor" opacity="0.3" />
      <path d="M95 75 L80 75 M80 75 L86 69 M80 75 L86 81" stroke="currentColor" strokeWidth="1.5" opacity="0.35" strokeLinecap="round" />
    </svg>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

const STATUS_CFG = {
  detecting: { label: "DETECTING", color: "rgba(255,255,255,0.35)", border: "rgba(255,255,255,0.1)", bg: "rgba(0,0,0,0.5)" },
  mapping:   { label: "MAPPING",   color: "#f97316",                border: "rgba(249,115,22,0.3)",  bg: "rgba(249,115,22,0.08)" },
  locked:    { label: "LOCKED ✓",  color: "#5fd0bf",                border: "rgba(95,208,191,0.3)",  bg: "rgba(95,208,191,0.08)" },
};

export default function UploadPage() {
  const router = useRouter();
  const { t, lang } = useLang();
  const { user, authLoading, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faceMeshRef = useRef<any>(null);
  const rafRef = useRef<number>(0);

  // Detection refs (read by RAF callback — kept as refs to avoid stale closures)
  const statusRef      = useRef<DetectionStatus>("detecting");
  const revealCountRef = useRef(0);
  const mappingStartRef = useRef(0);
  const noFaceCountRef = useRef(0);
  const scanYRef       = useRef(0);
  const scanDirRef     = useRef(1);
  const lastFrameTsRef = useRef(0);

  // Auto-capture refs
  const captureStepRef    = useRef(0);
  const capturedCountRef  = useRef(0);
  const holdStartRef      = useRef<number | null>(null);
  const capturedPhotosRef = useRef<Partial<Record<AngleId, string>>>({});

  // React state (drives rendering)
  const [phase, setPhase]                   = useState<Phase>("idle");
  const [cameraLoading, setCameraLoading]   = useState(false);
  const [detectionStatus, setDetStatus]     = useState<DetectionStatus>("detecting");
  const [revealCount, setRevealCount]       = useState(0);
  const [metrics, setMetrics]               = useState<LiveMetrics | null>(null);
  const [captureStep, setCaptureStep]       = useState(0);
  const [holdProgress, setHoldProgress]     = useState(0);
  const [flashVisible, setFlashVisible]     = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<Partial<Record<AngleId, string>>>({});
  const [currentYaw, setCurrentYaw]         = useState(0);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  // Capture one frame and advance to next step — stable (only refs + setters)
  const doCapture = useCallback((step: number) => {
    const video = videoRef.current;
    if (!video) return;

    const cap = document.createElement("canvas");
    cap.width  = video.videoWidth;
    cap.height = video.videoHeight;
    const ctx  = cap.getContext("2d");
    if (ctx) {
      ctx.translate(cap.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
    }
    const base64  = cap.toDataURL("image/jpeg", 0.92);
    const angleId = STEP_ANGLE_IDS[step];

    // Store downscaled front photo for before/after slider on results page
    if (angleId === "front") {
      const ratio = Math.min(1, 640 / cap.width);
      const sc = document.createElement("canvas");
      sc.width  = Math.round(cap.width  * ratio);
      sc.height = Math.round(cap.height * ratio);
      sc.getContext("2d")?.drawImage(cap, 0, 0, sc.width, sc.height);
      sessionStorage.setItem("mogrank_photo", sc.toDataURL("image/jpeg", 0.82));
    }

    capturedPhotosRef.current = { ...capturedPhotosRef.current, [angleId]: base64 };
    capturedCountRef.current  = step + 1;
    setCapturedPhotos({ ...capturedPhotosRef.current });

    playBeep();
    setFlashVisible(true);
    setTimeout(() => setFlashVisible(false), 700);

    holdStartRef.current = null;
    setHoldProgress(0);

    const nextStep = step + 1;
    if (nextStep >= 3) {
      // All done — stop camera after flash completes
      setTimeout(() => {
        cancelAnimationFrame(rafRef.current);
        streamRef.current?.getTracks().forEach((tr) => tr.stop());
        streamRef.current  = null;
        faceMeshRef.current = null;
        setPhase("preview");
      }, 800);
    } else {
      captureStepRef.current = nextStep;
      setCaptureStep(nextStep);
    }
  }, []);

  const handleResults = useCallback(
    (results: { multiFaceLandmarks?: Array<Array<{ x: number; y: number; z: number }>> }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const cw = canvas.width, ch = canvas.height;
      if (cw === 0 || ch === 0) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const lms = results.multiFaceLandmarks?.[0];
      if (!lms || lms.length < 10) {
        noFaceCountRef.current++;
        if (noFaceCountRef.current > 15) {
          statusRef.current    = "detecting";
          revealCountRef.current = 0;
          holdStartRef.current = null;
          setDetStatus("detecting");
          setRevealCount(0);
          setMetrics(null);
          setHoldProgress(0);
        }
        ctx.clearRect(0, 0, cw, ch);
        return;
      }

      noFaceCountRef.current = 0;
      const now = performance.now();
      if (lastFrameTsRef.current === 0) lastFrameTsRef.current = now;
      const dt = now - lastFrameTsRef.current;
      lastFrameTsRef.current = now;

      // State machine: detecting → mapping → locked
      if (statusRef.current === "detecting") {
        statusRef.current     = "mapping";
        mappingStartRef.current = now;
        revealCountRef.current = 0;
        setDetStatus("mapping");
      }
      if (statusRef.current === "mapping") {
        const progress = Math.min((now - mappingStartRef.current) / 900, 1);
        revealCountRef.current = Math.round(progress * lms.length);
        setRevealCount(revealCountRef.current);
        if (progress >= 1) { statusRef.current = "locked"; setDetStatus("locked"); }
      }
      if (statusRef.current !== "locked") {
        scanYRef.current += scanDirRef.current * dt * 0.08;
        if (scanYRef.current >= 100) { scanYRef.current = 100; scanDirRef.current = -1; }
        if (scanYRef.current <= 0)   { scanYRef.current = 0;   scanDirRef.current = 1; }
      }

      if (statusRef.current === "locked") {
        setMetrics(computeMetrics(lms, cw, ch));

        const step = captureStepRef.current;
        if (capturedCountRef.current <= step) {
          const yaw = computeYaw(lms);
          setCurrentYaw(yaw);

          if (inPosition(yaw, step)) {
            if (holdStartRef.current === null) holdStartRef.current = now;
            const prog = Math.min((now - holdStartRef.current) / HOLD_MS, 1);
            setHoldProgress(prog);
            if (prog >= 1) doCapture(step);
          } else {
            if (holdStartRef.current !== null) {
              holdStartRef.current = null;
              setHoldProgress(0);
            }
          }
        }
      }

      drawOverlay(ctx, lms, cw, ch, revealCountRef.current, scanYRef.current, statusRef.current);
    },
    [doCapture]
  );

  const startCamera = async () => {
    // Reset all state for a fresh run
    captureStepRef.current    = 0;
    capturedCountRef.current  = 0;
    capturedPhotosRef.current = {};
    holdStartRef.current      = null;
    statusRef.current         = "detecting";
    revealCountRef.current    = 0;
    lastFrameTsRef.current    = 0;
    scanYRef.current          = 0;
    scanDirRef.current        = 1;
    noFaceCountRef.current    = 0;

    setCaptureStep(0);
    setCapturedPhotos({});
    setDetStatus("detecting");
    setRevealCount(0);
    setMetrics(null);
    setHoldProgress(0);
    setFlashVisible(false);
    setCurrentYaw(0);
    setError(null);
    setPhase("camera");
    setCameraLoading(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      const { FaceMesh } = await import("@mediapipe/face_mesh");
      const faceMesh = new FaceMesh({
        locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
      });
      faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      faceMesh.onResults(handleResults);
      faceMeshRef.current = faceMesh;

      setCameraLoading(false);
      await new Promise<void>((r) => setTimeout(r, 50));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      const loop = async () => {
        if (!streamRef.current?.active || !videoRef.current || !faceMeshRef.current) return;
        const vid = videoRef.current;
        if (vid.readyState >= 2 && vid.videoWidth > 0) {
          if (canvasRef.current) {
            if (canvasRef.current.width  !== vid.videoWidth)  canvasRef.current.width  = vid.videoWidth;
            if (canvasRef.current.height !== vid.videoHeight) canvasRef.current.height = vid.videoHeight;
          }
          try { await faceMeshRef.current.send({ image: vid }); } catch { /* ignore */ }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setError(t.upload.errCamera);
      setCameraLoading(false);
      setPhase("idle");
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
  };

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current  = null;
    faceMeshRef.current = null;
    setPhase("idle");
    setCameraLoading(false);
  };

  const handleAnalyze = async () => {
    const photos = capturedPhotosRef.current as Record<AngleId, string>;
    if (!photos.front || !photos.left || !photos.right) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: [photos.front, photos.left, photos.right], mimeType: "image/jpeg", lang }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg ?? t.upload.errAnalysisFailed);
      }
      const analysisResult = await res.json();
      const analysisId = `mog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem("mogrank_analysis_id", analysisId);
      sessionStorage.setItem("mogrank_results", JSON.stringify(analysisResult));

      // Save analysis to Supabase when user is logged in (fire-and-forget)
      if (user) {
        try {
          let thumbnail: string | null = null;
          const img = new Image();
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = photos.front;
          });
          if (img.width > 0) {
            const thumb = document.createElement("canvas");
            const scale = 80 / img.width;
            thumb.width = 80;
            thumb.height = Math.round(img.height * scale);
            thumb.getContext("2d")?.drawImage(img, 0, 0, thumb.width, thumb.height);
            thumbnail = thumb.toDataURL("image/jpeg", 0.65);
          }
          const supabase = getBrowserClient();
          if (supabase) {
            (async () => {
              try {
                await supabase.from("analyses").insert({
                  user_id: user.id,
                  session_id: analysisId,
                  score: typeof analysisResult.overall_score === "number" ? analysisResult.overall_score : null,
                  results: analysisResult,
                  photo_url: thumbnail,
                });
              } catch { /* ignore */ }
            })();
          }
        } catch { /* ignore — never block navigation */ }
      }

      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.upload.errSomethingWrong);
      setLoading(false);
    }
  };

  // ── derived render values ──────────────────────────────────────────────────

  const sCfg = STATUS_CFG[detectionStatus];

  const STEP_INSTRUCT = [
    t.upload.cameraInstructFront,
    t.upload.cameraInstructLeft,
    t.upload.cameraInstructRight,
  ];

  const STEP_LABELS = [t.upload.angleFront, t.upload.angleLeft, t.upload.angleRight];

  function getHint(): string {
    if (detectionStatus !== "locked") return "";
    const yaw = currentYaw;
    if (captureStep === 0) {
      if (yaw > 0.10) return t.upload.hintLeft;
      if (yaw < -0.10) return t.upload.hintRight;
      return t.upload.hintHold;
    }
    if (captureStep === 1) {
      return yaw < 0.15 ? t.upload.hintLeft : t.upload.hintHold;
    }
    return yaw > -0.15 ? t.upload.hintRight : t.upload.hintHold;
  }

  const hint = getHint();
  const ringCircumference = 2 * Math.PI * 32;

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="text-xl font-bold tracking-widest gold-text">MOGRANK</Link>
        <div className="flex items-center gap-3">
          <LangToggle className="flex items-center text-[11px] font-bold tracking-[0.08em] text-white/60 hover:text-white/90 transition-opacity" />
          {!authLoading && user ? (
            <>
              <Link href="/progress" className="text-xs text-white/50 hover:text-white transition-colors hidden sm:block">
                Ma Progression
              </Link>
              <span className="text-xs text-white/40 hidden sm:block" style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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

      {/* ── IDLE ─────────────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <div className="flex-1 flex flex-col items-center px-6 py-12">
          <p className="text-xs uppercase tracking-[0.3em] text-[#e99846] mb-3 font-semibold">
            {t.upload.step}
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-center mb-3">{t.upload.multiTitle}</h1>
          <p className="text-white/40 text-center mb-10 max-w-sm">{t.upload.multiSubtitle}</p>

          {/* Step preview cards */}
          <div className="w-full max-w-sm grid grid-cols-3 gap-4 mb-10">
            {(["front", "left", "right"] as AngleId[]).map((id, idx) => (
              <div key={id} className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/40">
                  {idx + 1}
                </div>
                <div className="w-full aspect-[3/4] rounded-2xl border border-dashed border-white/10 flex items-center justify-center bg-white/[0.02] p-2">
                  <div className="w-10 h-14 text-[#e99846]/30">
                    <FaceGuide angleId={id} />
                  </div>
                </div>
                <p className="text-[9px] text-white/30 text-center">{STEP_LABELS[idx]}</p>
              </div>
            ))}
          </div>

          {error && <p className="mb-4 text-red-400 text-sm text-center max-w-xs">{error}</p>}

          <button
            onClick={startCamera}
            className="px-12 py-4 rounded-full font-bold text-base bg-[#e99846] text-[#0a0a0a] hover:bg-[#f0b060] hover:scale-105 shadow-lg shadow-[#e99846]/20 transition-all"
          >
            {t.upload.startBtn}
          </button>
        </div>
      )}

      {/* ── CAMERA MODAL ─────────────────────────────────────────────────── */}
      {(phase === "camera" || phase === "preview") && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">

          {/* Loading state */}
          {cameraLoading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-2 border-[#5fd0bf] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono tracking-widest text-[#5fd0bf]/60 uppercase">Initializing…</span>
            </div>
          )}

          {/* Camera capture phase */}
          {phase === "camera" && !cameraLoading && (
            <>
              {/* Header */}
              <div className="flex-none px-5 pt-5 pb-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-white truncate">
                    {STEP_INSTRUCT[captureStep]}
                  </p>
                  {/* Step dots + progress */}
                  <div className="flex items-center gap-2 mt-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-1 text-[10px] font-mono transition-colors ${
                          i < captureStep ? "text-[#5fd0bf]" : i === captureStep ? "text-[#e99846]" : "text-white/20"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            i < captureStep ? "bg-[#5fd0bf]" : i === captureStep ? "bg-[#e99846] animate-pulse" : "bg-white/15"
                          }`}
                        />
                        {STEP_LABELS[i]}
                      </div>
                    ))}
                    <span className="ml-auto text-[10px] font-mono text-white/30">{captureStep}/3</span>
                  </div>
                </div>
                <button
                  onClick={stopCamera}
                  className="flex-none mt-0.5 px-4 py-2 rounded-full text-sm font-semibold border border-white/15 text-white/50 hover:text-white transition-colors"
                >
                  {t.upload.cancel}
                </button>
              </div>

              {/* Progress bar */}
              <div className="h-0.5 bg-white/5 flex-none">
                <div
                  className="h-full bg-[#e99846] transition-all duration-500"
                  style={{ width: `${(captureStep / 3) * 100}%` }}
                />
              </div>

              {/* Camera view */}
              <div className="flex-1 relative overflow-hidden">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  ref={videoRef}
                  autoPlay playsInline muted
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />

                {/* Face guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-40 h-52 opacity-20 transition-opacity duration-500" style={{ color: "#e99846" }}>
                    <FaceGuide angleId={STEP_ANGLE_IDS[captureStep] ?? "front"} />
                  </div>
                </div>

                {/* Landmark canvas */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ transform: "scaleX(-1)" }}
                />

                {/* Status badge */}
                <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none">
                  <span
                    className="px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-[0.15em] border transition-all duration-300"
                    style={{ color: sCfg.color, borderColor: sCfg.border, background: sCfg.bg }}
                  >
                    {sCfg.label}
                  </span>
                </div>

                {/* Realtime metrics */}
                {metrics && detectionStatus === "locked" && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 pointer-events-none">
                    {[
                      { label: "SYM",  value: `${metrics.symmetry}%`, color: "#5fd0bf" },
                      { label: "CANT", value: `${metrics.canthal > 0 ? "+" : ""}${metrics.canthal}°`, color: "#f97316" },
                      { label: "JAW",  value: metrics.jawGrade, color: "#e99846" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="px-2 py-1.5 rounded-lg border text-center min-w-[52px]"
                           style={{ borderColor: `${color}30`, background: `${color}10` }}>
                        <div className="text-[8px] font-mono font-bold tracking-wider" style={{ color: `${color}80` }}>{label}</div>
                        <div className="text-xs font-mono font-bold" style={{ color }}>{value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Countdown ring (when holding position) */}
                {holdProgress > 0 && !flashVisible && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
                    <div className="relative w-20 h-20">
                      <svg className="absolute inset-0" width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                        <circle
                          cx="40" cy="40" r="32"
                          fill="none"
                          stroke="#5fd0bf"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={ringCircumference}
                          strokeDashoffset={ringCircumference * (1 - holdProgress)}
                          style={{ transition: "stroke-dashoffset 0.05s linear" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[9px] font-mono font-bold text-[#5fd0bf]">HOLD</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Direction hint */}
                {hint && !flashVisible && holdProgress === 0 && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
                    <span className="px-4 py-2 rounded-full text-sm font-bold bg-black/60 border border-white/10 text-white/70">
                      {hint}
                    </span>
                  </div>
                )}

                {/* Captured thumbnails (bottom-left) */}
                <div className="absolute bottom-3 left-3 flex gap-1.5 pointer-events-none">
                  {([0, 1, 2] as const).map((i) => {
                    const photo = capturedPhotos[STEP_ANGLE_IDS[i]];
                    return (
                      <div
                        key={i}
                        className={`w-12 h-16 rounded-lg overflow-hidden border transition-all duration-300 ${
                          photo ? "border-[#5fd0bf]/60 opacity-100" : "border-white/10 opacity-30"
                        }`}
                      >
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-white/5 flex items-center justify-center">
                            <span className="text-[9px] font-mono text-white/20">{i + 1}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Flash overlay — "CAPTURÉ ✓" */}
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300"
                  style={{ opacity: flashVisible ? 1 : 0, background: "rgba(95,208,191,0.12)" }}
                >
                  <div
                    className="bg-[#5fd0bf] px-8 py-4 rounded-2xl shadow-2xl transition-transform duration-200"
                    style={{ transform: flashVisible ? "scale(1)" : "scale(0.85)" }}
                  >
                    <p className="text-[#0a0a0a] font-black text-xl tracking-widest">CAPTURÉ ✓</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Preview phase — all 3 captured */}
          {phase === "preview" && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-8">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#5fd0bf] font-semibold text-center mb-2">
                  3 / 3
                </p>
                <h2 className="text-2xl font-black text-center">
                  {lang === "fr" ? "Prêt à analyser" : "Ready to analyse"}
                </h2>
              </div>

              {/* Preview grid */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                {([0, 1, 2] as const).map((i) => {
                  const photo = capturedPhotos[STEP_ANGLE_IDS[i]];
                  return (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <div className="w-full aspect-[3/4] rounded-xl overflow-hidden border border-[#5fd0bf]/40">
                        {photo && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt={STEP_LABELS[i]} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-[#5fd0bf] flex items-center justify-center">
                          <svg className="w-2 h-2 text-[#0a0a0a]" fill="none" viewBox="0 0 8 8" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 4l2 2 3-3" />
                          </svg>
                        </span>
                        <span className="text-[9px] font-semibold text-white/50">{STEP_LABELS[i]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && <p className="text-red-400 text-sm text-center max-w-xs">{error}</p>}

              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="px-12 py-4 rounded-full font-bold text-base bg-[#e99846] text-[#0a0a0a] hover:bg-[#f0b060] hover:scale-105 shadow-lg shadow-[#e99846]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                    </svg>
                    {t.upload.analyzing}
                  </span>
                ) : t.upload.analyseBtn}
              </button>

              <button
                onClick={() => { setCapturedPhotos({}); capturedPhotosRef.current = {}; startCamera(); }}
                className="text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                {t.upload.restartBtn}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
