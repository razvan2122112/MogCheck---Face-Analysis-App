"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function Home() {
  const surfaceRef  = useRef<HTMLCanvasElement>(null);
  const meshRef     = useRef<HTMLCanvasElement>(null);
  const panelRef    = useRef<HTMLDivElement>(null);
  const scoreRef    = useRef<HTMLSpanElement>(null);
  const [billing, setBilling] = useState<"month" | "year">("month");

  // ── Dotted wave surface ──────────────────────────────────────────────────
  useEffect(() => {
    const canvas = surfaceRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let W = 0, H = 0, dpr = 1, count = 0;
    let running = true, animId = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = canvas!.clientHeight || window.innerHeight * 0.62;
      canvas!.width  = W * dpr;
      canvas!.height = H * dpr;
      canvas!.style.width = W + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const AMOUNTX = 56, AMOUNTY = 64, SEP = 70;
    const PITCH = Math.PI / 5.2;
    const SA = Math.sin(PITCH), CA = Math.cos(PITCH);
    const CAM_Y = 240, CAM_Z = 900;

    type Cell = { ix: number; x: number; z: number };
    const cells: Cell[] = [];
    for (let ix = 0; ix < AMOUNTX; ix++)
      for (let iy = 0; iy < AMOUNTY; iy++)
        cells.push({ ix, x: (ix - AMOUNTX / 2) * SEP, z: (iy - AMOUNTY / 2) * SEP });

    function project(x: number, y: number, z: number) {
      const dy = y - CAM_Y, yr = dy * CA - z * SA, zr = dy * SA + z * CA + CAM_Z;
      if (zr <= 1) return null;
      const f = 620 / zr;
      return { sx: W / 2 + x * f, sy: H * 0.04 + yr * f + H * 0.5, depth: f };
    }

    type Dot = { sx: number; sy: number; d: number; wave: number };
    const tmp: Dot[] = new Array(cells.length);

    function frame() {
      ctx!.clearRect(0, 0, W, H);
      let n = 0;
      for (const c of cells) {
        const y = Math.sin((c.ix + count) * 0.28) * 22 + Math.sin((c.ix + count) * 0.42) * 22;
        const p = project(c.x, y, c.z);
        if (!p || p.sx < -20 || p.sx > W + 20 || p.sy < -20 || p.sy > H + 20) continue;
        tmp[n++] = { sx: p.sx, sy: p.sy, d: p.depth, wave: y };
      }
      tmp.length = n;
      tmp.sort((a, b) => a.d - b.d);
      for (let i = 0; i < n; i++) {
        const { sx, sy, d, wave } = tmp[i];
        const r = Math.max(0.3, d * 2.2);
        const a = Math.min(0.9, 0.04 + d * 1.6);
        const t = (wave + 50) / 100;
        const [R, G, B] = t > 0.7 ? [233,200,140] : t < 0.3 ? [160,220,210] : [230,226,215];
        ctx!.fillStyle = `rgba(${R},${G},${B},${a.toFixed(3)})`;
        ctx!.beginPath();
        ctx!.arc(sx, sy, r, 0, Math.PI * 2);
        ctx!.fill();
      }
      count += 0.05;
    }

    let last = performance.now();
    function loop(now?: number) {
      if (!running) return;
      const t = now ?? performance.now();
      if (t - last >= 18) { frame(); last = t; }
      animId = requestAnimationFrame(loop);
    }

    const onResize = () => resize();
    const onVisibility = () => { running = !document.hidden; if (running) loop(); };
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    loop();

    return () => {
      running = false;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // ── 3-D face mesh ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = meshRef.current;
    const panel  = panelRef.current;
    if (!canvas || !panel) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let W = 0, H = 0, DPR = 1, animId = 0;

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      const r = panel!.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas!.width  = W * DPR; canvas!.height = H * DPR;
      canvas!.style.width  = W + "px"; canvas!.style.height = H + "px";
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(panel);

    type V3 = [number, number, number];
    const V: V3[] = [
      [200,70,12],[160,82,2],[240,82,2],[125,108,-22],[275,108,-22],[200,100,28],
      [95,152,-40],[305,152,-40],[88,200,-48],[312,200,-48],
      [140,175,-6],[200,168,30],[260,175,-6],[170,188,14],[230,188,14],
      [128,218,-18],[160,212,6],[182,222,18],[218,222,18],[240,212,6],[272,218,-18],[148,232,-8],[252,232,-8],
      [200,215,50],[200,250,62],[185,282,56],[215,282,56],[200,300,78],[176,312,32],[224,312,32],[200,306,52],
      [108,252,-24],[292,252,-24],[126,290,-14],[274,290,-14],[156,272,4],[244,272,4],
      [180,340,30],[200,332,36],[220,340,30],[200,352,30],[170,346,14],[230,346,14],
      [118,322,-30],[282,322,-30],[140,364,-12],[260,364,-12],[170,396,8],[230,396,8],[200,412,22],
    ];
    const E_RAW: [number,number][] = [
      [0,1],[0,2],[0,5],[1,5],[2,5],[1,3],[2,4],[3,5],[4,5],[3,6],[4,7],
      [1,11],[2,11],[5,11],[3,10],[4,12],[10,11],[11,12],[10,13],[12,14],[11,13],[11,14],[13,14],
      [6,10],[7,12],[6,8],[7,9],[8,10],[9,12],[8,15],[9,20],
      [10,15],[12,20],[10,16],[12,19],[13,16],[14,19],[13,17],[14,18],[13,23],[14,23],
      [15,16],[16,17],[17,13],[18,14],[18,19],[19,20],[15,21],[20,22],[17,21],[18,22],[16,21],[19,22],
      [17,23],[18,23],[21,24],[22,24],[17,24],[18,24],
      [23,24],[24,25],[24,26],[25,26],[25,27],[26,27],[25,28],[26,29],[27,30],[28,30],[29,30],[28,29],[27,28],[27,29],
      [8,31],[9,32],[15,31],[20,32],[21,35],[22,36],[31,33],[32,34],[31,35],[32,36],[35,33],[36,34],
      [24,35],[24,36],[25,35],[26,36],[33,35],[34,36],
      [33,41],[34,42],[35,41],[36,42],[35,37],[36,39],[28,37],[29,39],[37,41],[39,42],
      [37,38],[38,39],[37,40],[39,40],[38,30],[37,30],[39,30],[41,37],[42,39],[41,40],[42,40],
      [8,43],[9,44],[33,43],[34,44],[43,45],[44,46],[43,41],[44,42],[41,45],[42,46],[45,40],[46,40],
      [45,47],[46,48],[47,40],[48,40],[47,49],[48,49],[40,49],
    ];
    const seen = new Set<string>();
    const E = E_RAW.filter(([a,b]) => {
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });

    const CX = 200, CY = 240;
    const VM: V3[] = V.map(([x,y,z]) => [x - CX, y - CY, z]);

    let targetYaw = 0, targetPitch = 0, yaw = 0, pitch = 0;
    let lastMove = performance.now();

    const onMouse = (e: MouseEvent) => {
      const r = panel!.getBoundingClientRect();
      const radius = Math.max(window.innerWidth, window.innerHeight) * 0.55;
      targetYaw   = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width  / 2) / radius)) * 0.55;
      targetPitch = Math.max(-1, Math.min(1, (e.clientY - r.top  - r.height / 2) / radius)) * 0.35;
      lastMove = performance.now();
    };
    window.addEventListener("mousemove", onMouse, { passive: true });

    const startedAt = performance.now();
    const FOCAL = 600, CAM_Z_M = 520;

    function proj(x: number, y: number, z: number) {
      const dz = CAM_Z_M - z;
      if (dz <= 1) return null;
      const f = FOCAL / dz;
      return { sx: W / 2 + x * f, sy: H / 2 + y * f + H * 0.02, z, f };
    }

    function rot([x,y,z]: V3, ya: number, pa: number): V3 {
      const cp = Math.cos(pa), sp = Math.sin(pa), cy = Math.cos(ya), sy = Math.sin(ya);
      const y1 = y * cp - z * sp, z1 = y * sp + z * cp;
      return [x * cy + z1 * sy, y1, -x * sy + z1 * cy];
    }

    function frame(now: number) {
      if (now - lastMove > 1800) {
        const t = now * 0.0006;
        targetYaw = Math.sin(t) * 0.25;
        targetPitch = Math.cos(t * 0.7) * 0.12;
      }
      yaw   += (targetYaw   - yaw)   * 0.08;
      pitch += (targetPitch - pitch) * 0.08;

      const edgeProg = Math.min(1, (now - startedAt) / 1400);
      const nodeProg = Math.min(1, Math.max(0, (now - startedAt - 1400) / 600));

      const PV = VM.map(v => { const r = rot(v, yaw, pitch); return { r, p: proj(r[0], r[1], r[2]) }; });
      ctx!.clearRect(0, 0, W, H);
      ctx!.lineCap = "round";

      // edges
      type ED = { pa: NonNullable<ReturnType<typeof proj>>; pb: NonNullable<ReturnType<typeof proj>>; midZ: number; alpha: number; ox: number; bx: number };
      const edges: ED[] = [];
      for (let i = 0; i < E.length; i++) {
        const [a, b] = E[i];
        const pa = PV[a].p, pb = PV[b].p;
        if (!pa || !pb) continue;
        const sf = i / E.length;
        if (edgeProg < sf * 0.85) continue;
        edges.push({ pa, pb, midZ: (PV[a].r[2] + PV[b].r[2]) / 2, alpha: Math.min(1, (edgeProg - sf * 0.85) / 0.15), ox: VM[a][0], bx: VM[b][0] });
      }
      edges.sort((u,v) => u.midZ - v.midZ);
      for (const { pa, pb, midZ, alpha, ox, bx } of edges) {
        const side = ox < -6 && bx < -6 ? "L" : ox > 6 && bx > 6 ? "R" : "M";
        const db = Math.max(0, Math.min(1, (midZ + 60) / 140));
        const ba = (0.35 + db * 0.55) * alpha;
        ctx!.strokeStyle = side === "L" ? `rgba(95,208,191,${ba.toFixed(3)})` : side === "R" ? `rgba(233,184,100,${ba.toFixed(3)})` : `rgba(245,243,238,${(ba * 0.55).toFixed(3)})`;
        ctx!.lineWidth = 0.9 + db * 0.5;
        ctx!.beginPath(); ctx!.moveTo(pa.sx, pa.sy); ctx!.lineTo(pb.sx, pb.sy); ctx!.stroke();
      }

      // nodes
      const nodes = PV.map((pv, idx) => ({ ...pv, idx })).filter(n => n.p).sort((a,b) => a.r[2] - b.r[2]);
      for (const n of nodes) {
        if (nodeProg < (n.idx / VM.length) * 0.7) continue;
        const ix = VM[n.idx][0];
        const side = ix < -6 ? "L" : ix > 6 ? "R" : "M";
        const db = Math.max(0.15, Math.min(1, (n.r[2] + 60) / 140));
        const r = 1.5 + db * 2.2;
        const fill = side === "L" ? `rgba(95,208,191,${(db * 0.85 + 0.15).toFixed(3)})` : side === "R" ? `rgba(233,184,100,${(db * 0.85 + 0.15).toFixed(3)})` : `rgba(245,243,238,${(db * 0.85 + 0.15).toFixed(3)})`;
        ctx!.fillStyle = fill; ctx!.beginPath(); ctx!.arc(n.p!.sx, n.p!.sy, r, 0, Math.PI * 2); ctx!.fill();
        if (db > 0.6) {
          const g = ctx!.createRadialGradient(n.p!.sx, n.p!.sy, 0, n.p!.sx, n.p!.sy, r * 4);
          g.addColorStop(0, fill.replace(/,([\d.]+)\)$/, `,${(0.3 * db).toFixed(3)})`));
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx!.fillStyle = g; ctx!.beginPath(); ctx!.arc(n.p!.sx, n.p!.sy, r * 4, 0, Math.PI * 2); ctx!.fill();
        }
      }
      animId = requestAnimationFrame(frame);
    }
    animId = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(animId); ro.disconnect(); window.removeEventListener("mousemove", onMouse); };
  }, []);

  // ── Score counter ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scoreRef.current;
    if (!el) return;
    let step = 0, s = 0, animId = 0;
    const target = 82;
    const tick = () => {
      step++;
      s = Math.min(target, Math.round(target * (1 - Math.pow(1 - step / 40, 3))));
      el.textContent = String(s);
      if (s < target) animId = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => { animId = requestAnimationFrame(tick); }, 400);
    return () => { clearTimeout(timer); cancelAnimationFrame(animId); };
  }, []);

  // ── Feature card mouse glow ──────────────────────────────────────────────
  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>(".feat");
    const cleanups: (() => void)[] = [];
    cards.forEach(card => {
      const fn = (e: MouseEvent) => card.style.setProperty("--mx", `${e.clientX - card.getBoundingClientRect().left}px`);
      card.addEventListener("mousemove", fn);
      cleanups.push(() => card.removeEventListener("mousemove", fn));
    });
    return () => cleanups.forEach(fn => fn());
  }, []);

  return (
    <>
      {/* Fixed dotted wave background */}
      <canvas
        ref={surfaceRef}
        aria-hidden="true"
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0,
          width: "100%", height: "48vh", pointerEvents: "none", zIndex: 0, opacity: 0.95,
          maskImage: "linear-gradient(180deg,transparent 0%,transparent 30%,rgba(0,0,0,0.4) 55%,black 80%,black 100%)",
          WebkitMaskImage: "linear-gradient(180deg,transparent 0%,transparent 30%,rgba(0,0,0,0.4) 55%,black 80%,black 100%)",
        }}
      />

      {/* ── NAV ── */}
      <nav className="nav">
        <div className="wrap nav-inner">
          <Link className="brand" href="/">
            <span className="brand-mark">M</span>
            <span>MogCheck</span>
          </Link>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#">Science</a>
          </div>
          <div className="nav-cta">
            <a href="#" className="btn btn-ghost" style={{height:"38px",padding:"0 14px",fontSize:"13px"}}>Sign in</a>
            <Link href="/upload" className="btn btn-gold" style={{height:"38px",padding:"0 16px",fontSize:"13px"}}>Try Free</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="wrap-wide hero-grid">
          {/* text side */}
          <div className="hero-text">
            <div className="eyebrow">
              <span className="dot" />
              <span>Now with v3 facial harmony model</span>
            </div>
            <h1 className="hero-title">
              Discover<br />Your <span className="serif it em">True</span><br />Potential.
            </h1>
            <p className="hero-sub">
              AI-powered facial analysis. Get your score, find your weak points, and unlock your best self — backed by 40+ biometric markers.
            </p>
            <div className="hero-cta">
              <Link href="/upload" className="btn btn-gold btn-lg">
                Analyze My Face — Free
                <svg className="arr" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <a href="#how" className="btn btn-ghost btn-lg">See how it works</a>
            </div>
            <div className="trust">
              <div className="avatars">
                <span>JM</span><span>AK</span><span>RP</span><span>SL</span>
              </div>
              <div>
                <div className="stars">★★★★★ <span style={{color:"var(--fg-2)",marginLeft:"6px"}}>4.9</span></div>
                <div style={{marginTop:"2px"}}>Trusted by 240,000+ users</div>
              </div>
            </div>
          </div>

          {/* dashboard scene */}
          <div className="dash">
            {/* left cards */}
            <div className="col">
              <div className="dcard">
                <h4>Symmetry</h4>
                <div className="body">
                  <div className="bars">
                    <div className="b t" style={{height:"62%"}} />
                    <div className="b t" style={{height:"82%"}} />
                    <div className="b g" style={{height:"90%"}} />
                    <div className="b g" style={{height:"70%"}} />
                  </div>
                </div>
                <div className="bars-labels"><span>Left</span><span>Right</span></div>
                <div className="foot"><span>Overall</span><b>94%</b></div>
              </div>

              <div className="dcard">
                <h4>Jawline</h4>
                <div className="body">
                  <div className="angle">
                    <svg viewBox="0 0 200 96" preserveAspectRatio="xMidYMid meet">
                      <path d="M 10 80 Q 60 70 96 50" stroke="var(--teal)" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
                      <path d="M 104 50 L 190 78" stroke="var(--gold)" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
                      <line x1="10" y1="80" x2="190" y2="80" stroke="rgba(255,255,255,0.08)" strokeDasharray="2 3"/>
                      <path d="M 80 64 A 18 18 0 0 1 116 60" stroke="rgba(233,184,100,0.5)" strokeWidth="0.8" fill="none" strokeDasharray="2 2"/>
                      <text x="58" y="50">45°</text>
                      <text x="124" y="44" fill="var(--gold)">60°</text>
                      <circle cx="100" cy="50" r="2.4" fill="var(--fg)"/>
                    </svg>
                  </div>
                </div>
                <div className="foot"><span>Sharpness</span><b>A+</b></div>
              </div>

              <div className="dcard">
                <h4>AI Summary</h4>
                <div className="sum-row"><span>Mog Score</span><b>82<span style={{fontSize:"11px",color:"var(--fg-3)"}}>/100</span></b></div>
                <div className="sum-row"><span>Percentile</span><b className="teal">94<span style={{fontSize:"11px",color:"var(--fg-3)"}}>th</span></b></div>
                <div className="sum-row"><span>Improvement</span><b>+6 pts</b></div>
              </div>
            </div>

            {/* face panel */}
            <div className="face-panel" ref={panelRef} id="facePanel">
              <div className="face-grid" />
              <canvas ref={meshRef} className="face-mesh-3d" aria-hidden="true" />
              <div className="scan" />
              <div className="score">
                <div>
                  <div className="score-lbl">Mog Score</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:"3px"}}>
                    <span className="score-num" ref={scoreRef}>0</span>
                    <span style={{color:"var(--fg-3)",fontFamily:"var(--font-dm-sans),sans-serif",fontSize:"18px"}}>/100</span>
                  </div>
                </div>
              </div>
              <div className="pill p1"><span className="k">Symmetry</span><span className="v">94%</span></div>
              <div className="pill p2"><span className="k">Jawline</span><span className="v">A+</span></div>
              <div className="pill p3"><span className="k">Golden Ratio</span><span className="v">1.61</span></div>
            </div>

            {/* right cards */}
            <div className="col">
              <div className="dcard">
                <h4>Canthal Tilt</h4>
                <div className="body">
                  <div className="eyes">
                    <div className="eye-card">
                      <svg viewBox="0 0 80 32" fill="none">
                        <path d="M 6 22 Q 40 6 74 18" stroke="var(--teal)" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
                        <ellipse cx="40" cy="18" rx="10" ry="6" fill="rgba(95,208,191,0.18)" stroke="var(--teal)" strokeWidth="0.8"/>
                        <circle cx="40" cy="18" r="3" fill="var(--teal)"/>
                      </svg>
                      <span>Left · +4°</span>
                    </div>
                    <div className="eye-card">
                      <svg viewBox="0 0 80 32" fill="none">
                        <path d="M 6 18 Q 40 6 74 22" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
                        <ellipse cx="40" cy="18" rx="10" ry="6" fill="rgba(233,184,100,0.18)" stroke="var(--gold)" strokeWidth="0.8"/>
                        <circle cx="40" cy="18" r="3" fill="var(--gold)"/>
                      </svg>
                      <span>Right · +5°</span>
                    </div>
                  </div>
                </div>
                <div className="foot"><span>Positive tilt</span><b>+4.5°</b></div>
              </div>

              <div className="dcard">
                <h4>Midface Ratio</h4>
                <div className="body">
                  <div className="verticals">
                    <div className="v"    style={{height:"55%"}} />
                    <div className="v gold" style={{height:"78%"}} />
                    <div className="v"    style={{height:"62%"}} />
                    <div className="v gold" style={{height:"88%"}} />
                    <div className="v"    style={{height:"46%"}} />
                    <div className="v gold" style={{height:"72%"}} />
                    <div className="v"    style={{height:"58%"}} />
                  </div>
                </div>
                <div className="foot"><span>Golden ratio</span><b>1.61</b></div>
              </div>

              <div className="dcard">
                <h4>Harmony Score</h4>
                <p style={{fontSize:"11.5px",color:"var(--fg-2)",margin:"2px 0 0",lineHeight:"1.4"}}>Composite of symmetry, ratios &amp; proportion.</p>
                <div className="harmony-bar" />
                <div className="hr-scale"><span>0.0</span><span>0.5</span><span>1.0</span></div>
                <div className="foot"><span>Your score</span><b>0.82</b></div>
              </div>
            </div>
          </div>
        </div>
        <span className="watermark">mog.</span>
      </section>

      {/* ── FEATURES ── */}
      <section className="section" id="features">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="section-num">01 — What you get</div>
              <h2 className="section-title">Everything you need to understand <span className="serif it">your face</span>.</h2>
            </div>
            <p className="section-lede">Three pillars of analysis. Built on a vision model trained against 12M anonymized facial datapoints.</p>
          </div>
          <div className="features">
            <div className="feat">
              <div className="feat-ico">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2.1 2.1M16.9 16.9 19 19M5 19l2.1-2.1M16.9 7.1 19 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="feat-tag">01 / Analysis</div>
              <h3 className="feat-title">Instant AI Analysis</h3>
              <p className="feat-desc">Upload a single photo. Our model processes 40+ landmarks, ratios and symmetry vectors in under 8 seconds — no waiting, no humans in the loop.</p>
              <div className="feat-foot"><span style={{color:"var(--gold)"}}>●</span><span>8.2s avg. processing</span></div>
            </div>
            <div className="feat">
              <div className="feat-ico">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="feat-tag">02 / Report</div>
              <h3 className="feat-title">Detailed Report</h3>
              <p className="feat-desc">A complete breakdown across 12 categories — symmetry, jawline, skin, eyes, harmony, golden ratio. See exactly where you stand and what raises your score.</p>
              <div className="feat-foot"><span style={{color:"var(--gold)"}}>●</span><span>12 categories scored</span></div>
            </div>
            <div className="feat">
              <div className="feat-ico">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 21s-7-4.5-7-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.5-7 11-7 11h-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M12 12v-2M10 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="feat-tag">03 / Improve</div>
              <h3 className="feat-title">Personalized Tips</h3>
              <p className="feat-desc">A concrete action plan tailored to your features — hairstyles, skincare routines, posture, grooming. Track progress as you re-scan over time.</p>
              <div className="feat-foot"><span style={{color:"var(--gold)"}}>●</span><span>Updated weekly</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section" id="how">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="section-num">02 — How it works</div>
              <h2 className="section-title">Three steps from <span className="serif it">selfie</span> to strategy.</h2>
            </div>
            <p className="section-lede">No accounts. No filters. No filler. Drop a photo, get the truth, then build a plan you can actually follow.</p>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-num"><b>01</b><span>Upload your photo</span></div>
              <div className="step-visual">
                <div className="upl">
                  <div className="upl-box">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="mono" style={{fontSize:"10px",letterSpacing:"0.12em",textTransform:"uppercase"}}>drag · jpg · png</div>
                </div>
              </div>
              <h3 className="step-title">Upload your photo</h3>
              <p className="step-desc">A clean front-facing shot is all we need. Photos are encrypted, never shared, and auto-deleted after 24h unless you save your report.</p>
            </div>
            <div className="step">
              <div className="step-num"><b>02</b><span>Get your score</span></div>
              <div className="step-visual">
                <div className="gauge">
                  <svg viewBox="0 0 160 90">
                    <path d="M10 85 A 70 70 0 0 1 150 85" stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" strokeLinecap="round"/>
                    <path d="M10 85 A 70 70 0 0 1 130 38" stroke="var(--gold)" strokeWidth="6" fill="none" strokeLinecap="round"/>
                  </svg>
                  <div className="gauge-num">82<small>/100</small></div>
                </div>
              </div>
              <h3 className="step-title">Get your score</h3>
              <p className="step-desc">Receive an overall Mog Score plus 12 sub-category scores. Every number is anchored to a percentile so you know exactly where you stand.</p>
            </div>
            <div className="step">
              <div className="step-num"><b>03</b><span>Improve yourself</span></div>
              <div className="step-visual">
                <div className="trend">
                  <svg viewBox="0 0 220 110" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="rgba(233,184,100,0.4)"/>
                        <stop offset="1" stopColor="rgba(233,184,100,0)"/>
                      </linearGradient>
                    </defs>
                    <path d="M0,80 L30,72 L60,75 L90,60 L120,55 L150,40 L180,32 L220,18 L220,110 L0,110 Z" fill="url(#tg)"/>
                    <path d="M0,80 L30,72 L60,75 L90,60 L120,55 L150,40 L180,32 L220,18" stroke="var(--gold)" strokeWidth="1.6" fill="none"/>
                    <circle cx="220" cy="18" r="3.5" fill="var(--gold)"/>
                    <circle cx="220" cy="18" r="7"   fill="rgba(233,184,100,0.18)"/>
                  </svg>
                </div>
              </div>
              <h3 className="step-title">Improve yourself</h3>
              <p className="step-desc">Follow your personalized roadmap. Re-scan monthly to watch your score climb. Most users gain +6 points within 90 days.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="section" id="pricing">
        <div className="wrap pricing-wrap">
          <div className="section-head">
            <div>
              <div className="section-num">03 — Pricing</div>
              <h2 className="section-title">One free scan. Or go <span className="serif it">all in</span>.</h2>
            </div>
            <p className="section-lede">Start free, no card required. Upgrade only when you want unlimited tracking and the full action plan.</p>
          </div>
          <div className="price-toggle">
            <button className={billing === "month" ? "active" : ""} onClick={() => setBilling("month")}>Monthly</button>
            <button className={billing === "year"  ? "active" : ""} onClick={() => setBilling("year")}>Yearly <span className="save">–30%</span></button>
          </div>
          <div className="plans">
            <div className="plan">
              <div className="plan-tag"><span>Free</span><span>Get started</span></div>
              <h3 className="plan-name">Starter</h3>
              <p className="plan-desc">Perfect for a one-time check-in. See your overall score and top three findings.</p>
              <div className="plan-price">
                <span className="cur">$</span><span className="amt">0</span><span className="per">forever</span>
              </div>
              <ul className="plan-feats">
                <li><span className="ck">✓</span> 1 face analysis</li>
                <li><span className="ck">✓</span> Overall Mog Score</li>
                <li><span className="ck">✓</span> Top 3 strengths &amp; weaknesses</li>
                <li className="muted"><span className="ck">✓</span> Full 12-category report</li>
                <li className="muted"><span className="ck">✓</span> Personalized action plan</li>
                <li className="muted"><span className="ck">✓</span> Progress tracking</li>
              </ul>
              <Link href="/upload" className="btn btn-ghost btn-lg plan-cta">
                Start free
                <svg className="arr" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
            <div className="plan pro">
              <div className="plan-tag"><span>Pro</span><span className="badge">Most picked</span></div>
              <h3 className="plan-name">Unlimited</h3>
              <p className="plan-desc">Track your transformation. Unlimited scans, the full report, and weekly-updated improvement plans.</p>
              <div className="plan-price">
                <span className="cur">$</span>
                <span className="amt">{billing === "year" ? "6.99" : "9.99"}</span>
                <span className="per">{billing === "year" ? "/ month, billed yearly" : "/ month"}</span>
              </div>
              <ul className="plan-feats">
                <li><span className="ck">✓</span> <b>Unlimited</b> face analyses</li>
                <li><span className="ck">✓</span> Full 12-category report</li>
                <li><span className="ck">✓</span> Personalized action plan</li>
                <li><span className="ck">✓</span> Monthly progress tracking</li>
                <li><span className="ck">✓</span> Before/after side-by-side</li>
                <li><span className="ck">✓</span> Priority AI model access</li>
              </ul>
              <Link href="/upload" className="btn btn-gold btn-lg plan-cta">
                Go Pro
                <svg className="arr" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <Link className="brand" href="/">
                <span className="brand-mark">M</span>
                <span>MogCheck</span>
              </Link>
              <p className="foot-blurb">The mirror that actually tells you the truth — and tells you what to do about it.</p>
            </div>
            <div className="foot-col">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#">Mobile app</a></li>
                <li><a href="#">Changelog</a></li>
              </ul>
            </div>
            <div className="foot-col">
              <h4>Resources</h4>
              <ul>
                <li><a href="#">The Science</a></li>
                <li><a href="#">Methodology</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Support</a></li>
              </ul>
            </div>
            <div className="foot-col">
              <h4>Company</h4>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Privacy</a></li>
                <li><a href="#">Terms</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="foot-bot">
            <div>© 2026 MogCheck Labs. All photos processed on-device where possible.</div>
            <div className="mono" style={{letterSpacing:"0.1em"}}>v3.2 · MOG-ENGINE</div>
          </div>
        </div>
      </footer>
    </>
  );
}
