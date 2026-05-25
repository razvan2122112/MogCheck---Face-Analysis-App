"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase";
import { useAuth } from "../context/auth";

type BattlePhase = "idle" | "searching" | "ready" | "battle" | "analyzing" | "result";
type DetectionStatus = "detecting" | "mapping" | "locked";

interface Opponent {
  id: string;
  score: number;
  name: string;
}

const MOCK_OPPONENTS: Opponent[] = [
  { id: "mock1", score: 71, name: "Challenger #47" },
  { id: "mock2", score: 63, name: "Challenger #112" },
  { id: "mock3", score: 78, name: "Challenger #83" },
  { id: "mock4", score: 55, name: "Challenger #29" },
  { id: "mock5", score: 84, name: "Challenger #201" },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function computeYaw(lms: Array<{ x: number; y: number; z: number }>): number {
  const noseX = lms[1].x;
  const faceCenter = (lms[234].x + lms[454].x) / 2;
  const faceWidth = Math.abs(lms[454].x - lms[234].x);
  if (faceWidth < 0.01) return 0;
  return (noseX - faceCenter) / faceWidth;
}

function drawBattleOverlay(
  ctx: CanvasRenderingContext2D,
  lms: Array<{ x: number; y: number; z: number }>,
  cw: number,
  ch: number,
  revealCount: number,
  status: DetectionStatus
) {
  ctx.clearRect(0, 0, cw, ch);

  const count = Math.min(revealCount, lms.length);
  for (let i = 0; i < count; i++) {
    const lm = lms[i];
    const color = "#5fd0bf";
    ctx.beginPath();
    ctx.arc(lm.x * cw, lm.y * ch, status === "locked" ? 1.6 : 1.2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = status === "locked" ? 5 : 2;
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  if (lms.length > 0) {
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
    const bColor = status === "locked" ? "#5fd0bf" : status === "mapping" ? "#e99846" : "rgba(255,255,255,0.4)";
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
  } catch { /* ignore */ }
}

// ─── SearchingDots ────────────────────────────────────────────────────────────

function SearchingDots() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setCount(c => (c % 3) + 1), 500);
    return () => clearInterval(t);
  }, []);
  return <span className="text-[#5fd0bf]/60 font-mono">{".".repeat(count)}</span>;
}

// ─── component ───────────────────────────────────────────────────────────────

export default function BattlePage() {
  const router = useRouter();
  const { user, authLoading, signOut } = useAuth();

  const [phase, setPhase] = useState<BattlePhase>("idle");
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [detectionStatus, setDetStatus] = useState<DetectionStatus>("detecting");
  const [userScore, setUserScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faceMeshRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs for RAF closure — avoid stale state
  const statusRef = useRef<DetectionStatus>("detecting");
  const revealCountRef = useRef(0);
  const mappingStartRef = useRef(0);
  const noFaceCountRef = useRef(0);
  const lastFrameTsRef = useRef(0);
  const capturedPhotoRef = useRef<string | null>(null);
  const hasCapturedRef = useRef(false);
  const countdownValueRef = useRef(10);
  const opponentRef = useRef<Opponent | null>(null);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(tr => tr.stop());
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return null;
    const cap = document.createElement("canvas");
    cap.width = video.videoWidth;
    cap.height = video.videoHeight;
    const ctx = cap.getContext("2d");
    if (!ctx) return null;
    ctx.translate(cap.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    return cap.toDataURL("image/jpeg", 0.92);
  }, []);

  const analyzeAndFinish = useCallback(async (photo: string) => {
    setPhase("analyzing");
    const opp = opponentRef.current;
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: photo, mimeType: "image/jpeg", lang: "fr" }),
      });
      let score = Math.floor(Math.random() * 20) + 55;
      if (res.ok) {
        const result = await res.json();
        const raw = result.overall_score ?? result.score;
        score = typeof raw === "number" ? Math.round(raw) : parseInt(String(raw ?? "")) || score;
      }
      setUserScore(score);

      // Store battle result (graceful failure — schema constraints may vary)
      try {
        const supabase = getBrowserClient();
        if (supabase && opp) {
          const { data: { user: cu } } = await supabase.auth.getUser();
          if (cu) {
            await supabase.from("battles").insert({
              user1_id: cu.id,
              winner_id: score >= opp.score ? cu.id : null,
            });
          }
        }
      } catch { /* ignore */ }

      setPhase("result");
    } catch {
      setUserScore(Math.floor(Math.random() * 25) + 55);
      setPhase("result");
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
          statusRef.current = "detecting";
          revealCountRef.current = 0;
          setDetStatus("detecting");
        }
        ctx.clearRect(0, 0, cw, ch);
        return;
      }

      noFaceCountRef.current = 0;
      const now = performance.now();
      if (lastFrameTsRef.current === 0) lastFrameTsRef.current = now;
      lastFrameTsRef.current = now;

      if (statusRef.current === "detecting") {
        statusRef.current = "mapping";
        mappingStartRef.current = now;
        revealCountRef.current = 0;
        setDetStatus("mapping");
      }
      if (statusRef.current === "mapping") {
        const progress = Math.min((now - mappingStartRef.current) / 900, 1);
        revealCountRef.current = Math.round(progress * lms.length);
        if (progress >= 1) { statusRef.current = "locked"; setDetStatus("locked"); }
      }

      // Auto-capture first frontal frame once face is locked
      if (statusRef.current === "locked" && !hasCapturedRef.current) {
        const yaw = computeYaw(lms);
        if (Math.abs(yaw) < 0.15) {
          const photo = captureFrame();
          if (photo) {
            capturedPhotoRef.current = photo;
            hasCapturedRef.current = true;
            setCapturedPhoto(photo);
            playBeep();
          }
        }
      }

      drawBattleOverlay(ctx, lms, cw, ch, revealCountRef.current, statusRef.current);
    },
    [captureFrame]
  );

  const launchBattle = useCallback(async (opp: Opponent) => {
    opponentRef.current = opp;
    setPhase("battle");
    setCountdown(10);
    countdownValueRef.current = 10;
    hasCapturedRef.current = false;
    capturedPhotoRef.current = null;
    statusRef.current = "detecting";
    revealCountRef.current = 0;
    lastFrameTsRef.current = 0;
    noFaceCountRef.current = 0;
    setDetStatus("detecting");
    setCapturedPhoto(null);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      const { FaceMesh } = await import("@mediapipe/face_mesh");
      const faceMesh = new FaceMesh({
        locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
      });
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      faceMesh.onResults(handleResults);
      faceMeshRef.current = faceMesh;

      await new Promise<void>(r => setTimeout(r, 50));

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
          try { await faceMeshRef.current.send({ image: vid }); } catch { /* ignore */ }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);

      countdownIntervalRef.current = setInterval(() => {
        countdownValueRef.current -= 1;
        setCountdown(countdownValueRef.current);

        if (countdownValueRef.current <= 0) {
          clearInterval(countdownIntervalRef.current!);
          countdownIntervalRef.current = null;

          const photo = capturedPhotoRef.current ?? captureFrame();
          cancelAnimationFrame(rafRef.current);
          streamRef.current?.getTracks().forEach(tr => tr.stop());
          streamRef.current = null;
          faceMeshRef.current = null;

          if (photo) {
            analyzeAndFinish(photo);
          } else {
            setError("Aucun visage détecté. Assure-toi d'être bien éclairé et réessaie.");
            setPhase("idle");
          }
        }
      }, 1000);
    } catch {
      setError("Impossible d'accéder à la caméra. Vérifie les permissions.");
      setPhase("idle");
    }
  }, [handleResults, captureFrame, analyzeAndFinish]);

  const handleFindOpponent = async () => {
    setPhase("searching");
    setError(null);

    let opp: Opponent;
    try {
      const supabase = getBrowserClient();
      let found: Opponent | null = null;
      if (supabase) {
        const { data } = await supabase
          .from("analyses")
          .select("id, result")
          .not("result", "is", null)
          .limit(50);
        if (data && data.length > 0) {
          const row = data[Math.floor(Math.random() * data.length)];
          const raw = row.result?.overall_score ?? row.result?.score;
          const score = typeof raw === "number"
            ? Math.round(raw)
            : parseInt(String(raw ?? "")) || 65;
          found = {
            id: row.id,
            score,
            name: `Challenger #${Math.floor(Math.random() * 999) + 1}`,
          };
        }
      }
      opp = found ?? MOCK_OPPONENTS[Math.floor(Math.random() * MOCK_OPPONENTS.length)];
    } catch {
      opp = MOCK_OPPONENTS[Math.floor(Math.random() * MOCK_OPPONENTS.length)];
    }

    // Minimum search animation time
    await new Promise(r => setTimeout(r, 2500));

    setOpponent(opp);
    setPhase("ready");
    setTimeout(() => launchBattle(opp), 1200);
  };

  const handleReplay = () => {
    setOpponent(null);
    setUserScore(null);
    setCapturedPhoto(null);
    setError(null);
    setPhase("idle");
  };

  const userWon = userScore !== null && opponent !== null && userScore >= opponent.score;

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-none">
        <Link href="/" className="text-xl font-bold tracking-widest gold-text">MOGRANK</Link>
        <div className="flex items-center gap-3">
          <Link href="/upload" className="text-xs text-white/40 hover:text-white/70 transition-colors hidden sm:block">
            Analyse
          </Link>
          {!authLoading && user ? (
            <>
              <span className="text-xs text-white/40 hidden sm:block truncate max-w-[130px]">{user.email}</span>
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

      {/* ── IDLE ─────────────────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-[#5fd0bf] mb-3 font-semibold">Beta · Gratuit</p>
            <h1 className="text-4xl sm:text-5xl font-black mb-4 leading-tight">
              Battle<br />
              <span className="text-[#5fd0bf]">Face à Face</span>
            </h1>
            <p className="text-white/40 max-w-xs mx-auto text-sm leading-relaxed">
              Affronte un adversaire aléatoire. L'IA analyse ton visage en live. Qui a le meilleur score ?
            </p>
          </div>

          {/* VS preview */}
          <div className="w-full max-w-xs mb-10">
            <div className="flex gap-4 items-stretch">
              <div className="flex-1 aspect-[3/4] rounded-2xl border border-[#5fd0bf]/20 bg-[#5fd0bf]/5 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">📷</div>
                  <div className="text-[10px] text-[#5fd0bf]/60 font-mono uppercase tracking-widest">Toi</div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 px-1">
                <div className="text-[#e99846] font-black text-xl">VS</div>
                <div className="w-px h-12 bg-white/10" />
                <div className="text-[9px] text-white/20">⚔️</div>
              </div>
              <div className="flex-1 aspect-[3/4] rounded-2xl border border-[#e99846]/20 bg-[#e99846]/5 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">🎭</div>
                  <div className="text-[10px] text-[#e99846]/60 font-mono uppercase tracking-widest">???</div>
                </div>
              </div>
            </div>
          </div>

          {error && <p className="mb-5 text-red-400 text-sm text-center max-w-xs">{error}</p>}

          <button
            onClick={handleFindOpponent}
            className="px-12 py-4 rounded-full font-bold text-base bg-[#5fd0bf] text-[#0a0a0a] hover:bg-[#4ac0af] hover:scale-105 shadow-lg shadow-[#5fd0bf]/20 transition-all"
          >
            Trouver un adversaire ⚔️
          </button>

          <Link href="/upload" className="mt-5 text-xs text-white/25 hover:text-white/50 transition-colors">
            ← Retour à l'analyse complète
          </Link>
        </div>
      )}

      {/* ── SEARCHING ────────────────────────────────────────────────────────── */}
      {phase === "searching" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
          <div className="relative w-28 h-28">
            <div
              className="absolute inset-0 rounded-full border border-[#5fd0bf]/15 animate-ping"
              style={{ animationDuration: "1.5s" }}
            />
            <div
              className="absolute inset-3 rounded-full border border-[#5fd0bf]/25 animate-ping"
              style={{ animationDuration: "1.5s", animationDelay: "0.4s" }}
            />
            <div className="absolute inset-6 rounded-full border-2 border-t-[#5fd0bf] border-[#5fd0bf]/20 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-3xl">⚔️</div>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold mb-2">
              Recherche en cours<SearchingDots />
            </p>
            <p className="text-xs text-white/25 font-mono uppercase tracking-[0.2em]">Scan mondial en cours</p>
          </div>
        </div>
      )}

      {/* ── READY ────────────────────────────────────────────────────────────── */}
      {phase === "ready" && opponent && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-[#5fd0bf] font-semibold mb-4">
              Adversaire trouvé !
            </p>
            <div className="text-6xl mb-4 animate-bounce">⚔️</div>
            <h2 className="text-3xl font-black">{opponent.name}</h2>
            <p className="text-white/30 text-sm mt-2 font-mono">Score : ???</p>
          </div>
          <p className="text-white/25 text-xs animate-pulse font-mono uppercase tracking-widest">
            Activation de la caméra...
          </p>
        </div>
      )}

      {/* ── BATTLE ───────────────────────────────────────────────────────────── */}
      {phase === "battle" && opponent && (
        <div className="fixed inset-0 z-50 bg-[#080808] flex flex-col">

          {/* Top — user live camera */}
          <div className="flex-1 relative overflow-hidden min-h-0">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ transform: "scaleX(-1)" }}
            />

            {/* Vignette bottom edge */}
            <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#080808] to-transparent pointer-events-none" />

            {/* User label */}
            <div className="absolute top-4 left-4 px-2.5 py-1 rounded-lg bg-black/70 border border-[#5fd0bf]/30 backdrop-blur-sm">
              <span className="text-[9px] font-mono font-bold text-[#5fd0bf] uppercase tracking-[0.15em]">
                📷 TOI
              </span>
            </div>

            {/* Capture badge */}
            {capturedPhoto && (
              <div className="absolute top-4 right-4 px-2.5 py-1 rounded-lg bg-[#5fd0bf]/15 border border-[#5fd0bf]/40 backdrop-blur-sm">
                <span className="text-[9px] font-mono font-bold text-[#5fd0bf]">✓ CAPTURÉ</span>
              </div>
            )}

            {/* Detection status */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
              <span
                className={`px-3 py-1 rounded-full text-[9px] font-mono font-bold tracking-[0.15em] border transition-all ${
                  detectionStatus === "locked"
                    ? "text-[#5fd0bf] border-[#5fd0bf]/30 bg-[#5fd0bf]/10"
                    : detectionStatus === "mapping"
                    ? "text-[#e99846] border-[#e99846]/30 bg-[#e99846]/10"
                    : "text-white/40 border-white/10 bg-black/40"
                }`}
              >
                {detectionStatus === "locked"
                  ? "LOCKED ✓"
                  : detectionStatus === "mapping"
                  ? "MAPPING..."
                  : "DETECTING..."}
              </span>
            </div>
          </div>

          {/* VS bar with countdown */}
          <div className="flex-none flex items-center justify-between gap-3 px-5 py-3 bg-[#0a0a0a] border-y border-white/[0.06]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full border border-[#5fd0bf]/40 flex items-center justify-center flex-none">
                <span className="text-[9px] font-mono font-bold text-[#5fd0bf]">T</span>
              </div>
              <span className="text-xs font-mono text-white/40 truncate">Toi</span>
            </div>

            {/* Countdown circle */}
            <div className="flex-none flex flex-col items-center gap-0.5">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center border-2 font-black text-2xl transition-all duration-300 ${
                  countdown <= 3
                    ? "border-red-500 text-red-400 bg-red-500/10"
                    : countdown <= 5
                    ? "border-[#e99846] text-[#e99846] bg-[#e99846]/8"
                    : "border-white/20 text-white bg-white/5"
                }`}
              >
                {countdown}
              </div>
              <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">sec</span>
            </div>

            <div className="flex items-center gap-2 min-w-0 justify-end">
              <span className="text-xs font-mono text-white/40 truncate text-right">
                {opponent.name.split(" ")[0]}
              </span>
              <div className="w-7 h-7 rounded-full border border-[#e99846]/40 flex items-center justify-center flex-none">
                <span className="text-[9px] font-mono font-bold text-[#e99846]">A</span>
              </div>
            </div>
          </div>

          {/* Bottom — opponent */}
          <div className="flex-1 relative overflow-hidden min-h-0 bg-[#0d0b08]">
            {/* Diagonal pattern background */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #e99846 0, #e99846 1px, transparent 0, transparent 50%)",
                backgroundSize: "10px 10px",
              }}
            />
            {/* Vignette top edge */}
            <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-[#0a0a0a] to-transparent pointer-events-none" />

            {/* Silhouette */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <div className="text-center">
                <svg viewBox="0 0 80 100" className="w-20 h-24 fill-[#e99846] mx-auto">
                  <ellipse cx="40" cy="28" rx="22" ry="26" />
                  <path d="M10 100 Q10 65 40 65 Q70 65 70 100Z" />
                </svg>
                <div className="text-[#e99846]/50 font-mono text-xs mt-1 uppercase tracking-widest">???</div>
              </div>
            </div>

            {/* Opponent label */}
            <div className="absolute top-4 left-4 px-2.5 py-1 rounded-lg bg-black/70 border border-[#e99846]/30 backdrop-blur-sm">
              <span className="text-[9px] font-mono font-bold text-[#e99846] uppercase tracking-[0.15em]">
                🎭 {opponent.name}
              </span>
            </div>

            {/* Hidden score badge */}
            <div className="absolute top-4 right-4 px-2.5 py-1 rounded-lg bg-[#e99846]/10 border border-[#e99846]/30 backdrop-blur-sm">
              <span className="text-[9px] font-mono font-bold text-[#e99846]">Score : ???</span>
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYZING ────────────────────────────────────────────────────────── */}
      {phase === "analyzing" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-2 border-[#e99846]/15" />
            <div className="absolute inset-0 rounded-full border-2 border-t-[#e99846] border-[#e99846]/10 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">🧠</div>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold mb-1">Analyse en cours...</p>
            <p className="text-xs text-white/30 font-mono">L'IA calcule ton score de battle</p>
          </div>
        </div>
      )}

      {/* ── RESULT ───────────────────────────────────────────────────────────── */}
      {phase === "result" && opponent && userScore !== null && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-8">
          {/* Verdict */}
          <div className="text-center">
            {userWon ? (
              <>
                <div className="text-7xl mb-3">👑</div>
                <h1 className="text-5xl font-black text-[#e99846]">MOG</h1>
                <p className="text-white/40 mt-2 text-sm">Tu as dominé l'adversaire !</p>
              </>
            ) : (
              <>
                <div className="text-7xl mb-3">💀</div>
                <h1 className="text-5xl font-black text-[#5fd0bf]">MOGGED</h1>
                <p className="text-white/40 mt-2 text-sm">L'adversaire était plus fort</p>
              </>
            )}
          </div>

          {/* Score comparison */}
          <div className="w-full max-w-sm">
            <div className="flex items-stretch gap-3">
              {/* User */}
              <div
                className={`flex-1 rounded-2xl p-4 text-center border ${
                  userWon
                    ? "border-[#e99846]/40 bg-[#e99846]/[0.06]"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-2">
                  📷 Toi
                </div>
                <div className={`text-5xl font-black ${userWon ? "text-[#e99846]" : "text-white/70"}`}>
                  {userScore}
                </div>
                <div className="text-[10px] text-white/20 mt-0.5">/100</div>
                {userWon && (
                  <div className="mt-2 text-[9px] font-mono text-[#e99846] uppercase tracking-widest font-bold">
                    👑 WINNER
                  </div>
                )}
              </div>

              {/* Delta */}
              <div className="flex flex-col items-center justify-center gap-1.5 px-1">
                <div className="text-white/15 font-black text-base">VS</div>
                <div
                  className={`text-sm font-black ${
                    userScore > opponent.score
                      ? "text-[#e99846]"
                      : userScore < opponent.score
                      ? "text-[#5fd0bf]"
                      : "text-white/30"
                  }`}
                >
                  {userScore > opponent.score
                    ? `+${userScore - opponent.score}`
                    : userScore < opponent.score
                    ? `-${opponent.score - userScore}`
                    : "="}
                </div>
              </div>

              {/* Opponent */}
              <div
                className={`flex-1 rounded-2xl p-4 text-center border ${
                  !userWon
                    ? "border-[#5fd0bf]/40 bg-[#5fd0bf]/[0.06]"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-2">
                  🎭 {opponent.name.split(" ")[0]}
                </div>
                <div className={`text-5xl font-black ${!userWon ? "text-[#5fd0bf]" : "text-white/70"}`}>
                  {opponent.score}
                </div>
                <div className="text-[10px] text-white/20 mt-0.5">/100</div>
                {!userWon && (
                  <div className="mt-2 text-[9px] font-mono text-[#5fd0bf] uppercase tracking-widest font-bold">
                    👑 WINNER
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col w-full max-w-sm gap-3">
            <Link
              href="/upload"
              className="w-full py-4 rounded-full font-bold text-sm bg-[#e99846] text-[#0a0a0a] hover:bg-[#f0b060] hover:scale-[1.02] shadow-lg shadow-[#e99846]/15 transition-all text-center"
            >
              Voir ton analyse complète →
            </Link>
            <button
              onClick={handleReplay}
              className="w-full py-4 rounded-full font-bold text-sm border border-white/15 text-white/60 hover:border-white/30 hover:text-white transition-all"
            >
              Rejouer ⚔️
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
