"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "./context/language";
import { useAuth } from "./context/auth";
import "./landing.css";

const CARDS = [
  { img: "90bbc065-8dc6-4c04-abc8-9c88c3cfbd8e", glow: true, tag: "Featured · 90 days", tagFr: "Mis en avant · 90 jours", name: "Lucas · 22", from: "6.1", to: "8.4" },
  { img: "41d47a27-1905-4f2f-abce-1b30a1078e40", tag: "+2.1", name: "Théo · 19",  from: "5.8", to: "7.9" },
  { img: "346a19c4-5339-4af5-b66f-13a05e751c9d", tag: "+3.0", name: "Adrien · 24", from: "5.2", to: "8.2" },
  { img: "91ea5e49-fe65-45a1-80cf-a599adab74de", tag: "+1.8", name: "Mateo · 17", from: "6.3", to: "8.1" },
  { img: "29d57c82-4e21-4f16-bd04-69f58c41ba26", tag: "+2.6", name: "Marco · 20", from: "5.9", to: "8.5" },
  { img: "74235975-ab7f-49c1-9633-a7ed9563b07f", tag: "+2.4", name: "Erik · 21",  from: "5.7", to: "8.1" },
];

export default function Home() {
  const { lang, setLang } = useLang();
  const { user, authLoading, signOut } = useAuth();
  const router = useRouter();
  const fr = lang === "fr";

  // Carousel state
  const [carouselIdx, setCarouselIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardsPerView = 3;
  const maxIdx = CARDS.length - cardsPerView;

  const goPrev = () => setCarouselIdx(i => Math.max(0, i - 1));
  const goNext = () => setCarouselIdx(i => Math.min(maxIdx, i + 1));

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const cardWidth = track.querySelector<HTMLElement>(".ba-card")?.offsetWidth ?? 0;
    const gap = 16;
    track.style.transform = `translateX(-${carouselIdx * (cardWidth + gap)}px)`;
  }, [carouselIdx]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  // Light theme override
  useEffect(() => {
    document.documentElement.dataset.landing = "1";
    return () => { delete document.documentElement.dataset.landing; };
  }, []);

  return (
    <div className="landing-pg">

      {/* ===== NAV ===== */}
      <nav className="nav">
        <div className="wrap nav-inner">
          <a className="brand" href="#" aria-label="MogRank">
            <span className="brand-mark" aria-hidden="true" />
            <span>MogRank</span>
          </a>
          <div className="nav-links">
            <a href="#">{fr ? "Accueil" : "Home"}</a>
            <a href="#how">{fr ? "Comment ça marche" : "How it works"}</a>
            <a href="#research">{fr ? "Recherche" : "Research"}</a>
          </div>
          <div className="nav-right">
            <div className="lang-switch" role="group" aria-label="Language">
              <button className={`lang-btn${lang === "en" ? " active" : ""}`} onClick={() => setLang("en")} title="English" aria-label="English">
                <svg viewBox="0 0 60 40" aria-hidden="true">
                  <rect width="60" height="40" fill="#012169"/>
                  <path d="M0 0L60 40M60 0L0 40" stroke="#fff" strokeWidth="8"/>
                  <path d="M0 0L60 40" stroke="#C8102E" strokeWidth="3.5"/>
                  <path d="M60 0L0 40" stroke="#C8102E" strokeWidth="3.5"/>
                  <path d="M30 0v40M0 20h60" stroke="#fff" strokeWidth="10"/>
                  <path d="M30 0v40M0 20h60" stroke="#C8102E" strokeWidth="6"/>
                </svg>
                <span>EN</span>
              </button>
              <button className={`lang-btn${lang === "fr" ? " active" : ""}`} onClick={() => setLang("fr")} title="Français" aria-label="Français">
                <svg viewBox="0 0 60 40" aria-hidden="true">
                  <rect width="20" height="40" fill="#002654"/>
                  <rect x="20" width="20" height="40" fill="#fff"/>
                  <rect x="40" width="20" height="40" fill="#ce1126"/>
                </svg>
                <span>FR</span>
              </button>
            </div>

            {!authLoading && user ? (
              <>
                <span style={{ fontSize: 12, color: "var(--ink-3)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.email}
                </span>
                <button onClick={handleSignOut} style={{ display:"inline-flex",alignItems:"center",height:38,padding:"0 14px",borderRadius:999,border:"1px solid var(--line-2)",background:"transparent",color:"var(--ink)",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit" }}>
                  {fr ? "Déconnexion" : "Sign out"}
                </button>
                <Link href="/upload" className="cta-primary">
                  {fr ? "Analyser" : "Analyze"}
                  <svg className="arr" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/login" style={{ display:"inline-flex",alignItems:"center",height:38,padding:"0 14px",borderRadius:999,border:"1px solid var(--line-2)",background:"transparent",color:"var(--ink)",fontSize:13,fontWeight:500,textDecoration:"none" }}>
                  {fr ? "Connexion" : "Login"}
                </Link>
                <Link href="/upload" className="cta-primary">
                  {fr ? "Obtenir mon score" : "Get my score"}
                  <svg className="arr" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="trust">
              <div className="trust-avatars">
                <span style={{ background: "linear-gradient(135deg,#d4a574,#7a5a2a)" }}/>
                <span style={{ background: "linear-gradient(135deg,#f4d4b8,#8b5a2b)" }}/>
                <span style={{ background: "linear-gradient(135deg,#c08a5e,#3d2818)" }}/>
                <span style={{ background: "linear-gradient(135deg,#e8c498,#a06840)" }}/>
              </div>
              <span>
                {fr
                  ? <>Aimé par 240 000+ utilisateurs · <span className="star">★</span> 4.9</>
                  : <>Loved by 240K+ users · <span className="star">★</span> 4.9</>}
              </span>
            </div>

            <h1 className="hero-title">
              <span className="meet">{fr ? "Découvrez MogRank" : "Meet MogRank"}</span>
              {fr
                ? <>Révélez votre potentiel <span className="gradient">en une seule photo.</span></>
                : <>Discover your potential <span className="gradient">with just a photo.</span></>}
            </h1>

            <p className="hero-sub">
              {fr
                ? "MogRank est l'app IA d'analyse faciale instantanée. Téléchargez une photo, obtenez votre score, identifiez vos points faibles et révélez votre meilleure version."
                : "Meet MogRank, the AI-powered app for instant facial analysis. Upload a photo, get your score, find your weak points and unlock your best self."}
            </p>

            <div className="hero-cta">
              <Link href="/upload" className="cta-primary cta-lg">
                {fr ? "Obtenir mon score" : "Get my score"}
                <svg className="arr" width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </div>

          {/* Phone mockups */}
          <div className="phones">
            {/* Phone 1: scanning */}
            <div className="phone phone-1">
              <div className="phone-screen">
                <div className="scan-screen">
                  <div className="scan-statusbar">
                    <span>9:41</span>
                    <div className="icons">
                      <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
                        <path d="M1 9V7M5 9V5M9 9V3M13 9V1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                        <path d="M1 4.5C2.5 3 4.5 2 6.5 2s4 1 5.5 2.5M3 6.5C4 5.5 5.2 5 6.5 5s2.5.5 3.5 1.5M5 8.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                      <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
                        <rect x="0.5" y="1" width="18" height="8" rx="2" stroke="currentColor"/>
                        <rect x="2" y="2.5" width="14" height="5" rx="1" fill="currentColor"/>
                        <rect x="19.5" y="3.5" width="1.5" height="3" rx="0.5" fill="currentColor"/>
                      </svg>
                    </div>
                  </div>
                  <div className="scan-header">
                    <h4>{fr ? "Scanner" : "Scanner"}</h4>
                    <div className="scan-iconbtn">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="3" cy="7" r="1.3" fill="currentColor"/>
                        <circle cx="7" cy="7" r="1.3" fill="currentColor"/>
                        <circle cx="11" cy="7" r="1.3" fill="currentColor"/>
                      </svg>
                    </div>
                  </div>
                  <div className="scan-area">
                    <div className="scan-face">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="56df77d3-3eae-4b72-b2c5-c392161a551a" alt="" />
                    </div>
                    <div className="scan-corner tl"/>
                    <div className="scan-corner tr"/>
                    <div className="scan-corner bl"/>
                    <div className="scan-corner br"/>
                    <div className="scan-beam"/>
                  </div>
                  <div className="scan-bottom">
                    <div className="scan-pill" style={{ padding:"10px 12px 7px", gap:6, width:91, lineHeight:1.45, letterSpacing:"0.1px", margin:-1, height:48, fontSize:12 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 2v3M7 9v3M2 7h3M9 7h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                      <span>{fr ? "Scanner le visage" : "Scan face"}</span>
                    </div>
                    <div className="scan-shutter" style={{ borderWidth:2, borderStyle:"solid" }}/>
                    <div style={{ width: 28 }}/>
                  </div>
                  <div className="scan-bottombar"/>
                </div>
              </div>
              <div className="phone-notch"/>
            </div>

            {/* Phone 2: results */}
            <div className="phone phone-2">
              <div className="phone-screen">
                <div className="result-screen">
                  <div className="result-statusbar">
                    <span>9:41</span>
                    <div style={{ display:"flex", gap:3, alignItems:"center" }}>
                      <svg width="12" height="10" viewBox="0 0 14 10" fill="currentColor">
                        <path d="M1 9V7M5 9V5M9 9V3M13 9V1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <svg width="18" height="10" viewBox="0 0 22 10" fill="none">
                        <rect x="0.5" y="1" width="18" height="8" rx="2" stroke="currentColor"/>
                        <rect x="2" y="2.5" width="14" height="5" rx="1" fill="currentColor"/>
                      </svg>
                    </div>
                  </div>
                  <div className="result-eyebrow">{fr ? "VOS RÉSULTATS" : "YOUR RESULTS"}</div>
                  <div className="result-h">{fr ? "Score Global" : "Global Score"}</div>
                  <div className="result-ring">
                    <svg width="108" height="108" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#222" strokeWidth="10"/>
                      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--accent)" strokeWidth="10" strokeDasharray="314" strokeDashoffset="69" strokeLinecap="round" transform="rotate(-90 60 60)"/>
                      <text x="60" y="56" textAnchor="middle" fill="var(--accent)" fontSize="26" fontWeight="600" fontFamily="DM Sans" letterSpacing="-1">7.8</text>
                      <text x="60" y="74" textAnchor="middle" fill="#666" fontSize="11" fontFamily="DM Sans">/ 10</text>
                    </svg>
                  </div>
                  <div className="result-tier">
                    {fr ? "Note : " : "Tier: "}<span className="gradient">High Tier</span>
                  </div>
                  <div className="result-tier-sub">NIVEAU LOOKSMAX : HIGH TIER</div>
                  <div className="result-card">
                    <div className="result-card-h">{fr ? "DÉTAIL DES MÉTRIQUES" : "METRICS DETAIL"}</div>
                    {([
                      [fr ? "Symétrie Faciale" : "Facial Symmetry", "8.2 / 10", 82],
                      [fr ? "Définition Mâchoire" : "Jaw Definition", "7.5 / 10", 75],
                      [fr ? "Inclinaison Canthale" : "Canthal Tilt", "8.0 / 10", 80],
                      [fr ? "Ratio Milieu Visage" : "Midface Ratio", "7.9 / 10", 79],
                      [fr ? "Qualité de la Peau" : "Skin Quality", "7.1 / 10", 71],
                    ] as [string, string, number][]).map(([label, val, pct]) => (
                      <div key={label} className="metric">
                        <div className="metric-head"><span>{label}</span><b>{val}</b></div>
                        <div className="metric-bar"><i style={{ width: `${pct}%` }}/></div>
                      </div>
                    ))}
                  </div>
                  <div className="result-card">
                    <div className="result-card-h">POTENTIEL</div>
                    <div className="potential-row"><span>High Tier</span><em>→ Elite</em></div>
                    <div className="potential-bar"><i style={{ width: "78%" }}/></div>
                  </div>
                  <div className="result-cta">{fr ? "Voir mon programme complet" : "See my full plan"}</div>
                  <div className="result-bottombar"/>
                </div>
              </div>
              <div className="phone-notch"/>
            </div>

            {/* Floating callouts */}
            <div className="callout callout-1">
              <div className="l">{fr ? "Score Face" : "Face Score"}</div>
              <div className="v">82<small style={{ fontSize:13, color:"var(--ink-3)", fontWeight:600 }}>/100</small></div>
            </div>
            <div className="callout callout-2">
              <div className="l">{fr ? "Symétrie" : "Symmetry"}</div>
              <div className="v">94<small style={{ fontSize:13, color:"var(--ink-3)", fontWeight:600 }}>%</small></div>
            </div>
            <div className="callout callout-3">
              <div className="l">Canthal Tilt</div>
              <div className="v">+5°</div>
            </div>

            {/* Hand-drawn connector arrow */}
            <div className="connector">
              <svg viewBox="0 0 120 80">
                <path d="M 5 70 Q 30 75 50 50 T 110 8"/>
                <path d="M 105 5 L 112 8 L 108 16" strokeDasharray="none"/>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TRANSFORMATIONS ===== */}
      <section className="section" id="transformations">
        <div className="wrap">
          <div className="section-eyebrow">{fr ? "Vraies transformations" : "Real transformations"}</div>
          <h2 className="section-h">
            {fr
              ? <>D&apos;un score à un <span className="gradient">nouveau visage</span></>
              : <>From a score to a <span className="gradient">new face</span></>}
          </h2>
          <p className="section-lede">
            {fr
              ? "De vrais utilisateurs, de vraies évolutions. Chaque transformation suit le plan d'action généré par MogRank après votre scan. Re-scannez chaque jour. Regardez votre score grimper."
              : "Real users, real glow-ups. Each transformation comes from following the action plan MogRank generates after your scan. Re-scan daily. Watch your score climb."}
          </p>

          {/* Carousel */}
          <div className="carousel" id="transCarousel">
            <div className="carousel-track" id="transTrack" ref={trackRef}>
              {CARDS.map((card, i) => (
                <div key={i} className="ba-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={card.img} alt="Before and after" />
                  <div className={`ba-tag${card.glow ? " glow" : ""}`}>
                    <span className="dot"/><span>{fr && card.tagFr ? card.tagFr : card.tag}</span>
                  </div>
                  <div className="ba-meta">
                    <div className="name">{card.name}</div>
                    <div className="score"><span className="v">{card.from} <span className="arrow">→</span> <b>{card.to}</b></span></div>
                  </div>
                </div>
              ))}
            </div>

            <button className="carousel-nav prev" onClick={goPrev} aria-label="Previous">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="carousel-nav next" onClick={goNext} aria-label="Next">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Carousel dots */}
          <div className="carousel-dots">
            {Array.from({ length: maxIdx + 1 }, (_, i) => (
              <button
                key={i}
                className={`carousel-dot${carouselIdx === i ? " active" : ""}`}
                onClick={() => setCarouselIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Features strip */}
          <div className="features-strip">
            <div className="feat-strip">
              <div className="feat-strip-ico">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="3.5" fill="currentColor"/>
                </svg>
              </div>
              <h3>{fr ? "Analyse IA instantanée" : "Instant AI analysis"}</h3>
              <p>{fr ? "Prenez une photo. Plus de 40 points, ratios et vecteurs de symétrie traités en moins de 8 secondes." : "Snap a photo. 40+ landmarks, ratios and symmetry vectors processed in under 8 seconds."}</p>
            </div>
            <div className="feat-strip">
              <div className="feat-strip-ico">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </div>
              <h3>{fr ? "Rapport détaillé" : "Detailed report"}</h3>
              <p>{fr ? "12 catégories notées plus les centiles. Voyez exactement où vous en êtes et ce qui fait grimper votre score." : "12 categories scored, plus percentile rankings. See exactly where you stand and what raises your score."}</p>
            </div>
            <div className="feat-strip">
              <div className="feat-strip-ico">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 21s-7-4.5-7-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.5-7 11-7 11h-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>{fr ? "Conseils personnalisés" : "Personalized tips"}</h3>
              <p>{fr ? "Un plan d'action concret adapté à vos traits. Suivez votre progression en re-scannant chaque jour." : "A concrete action plan tailored to your features. Track progress as you re-scan each day."}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== RESEARCH STATS ===== */}
      <section className="stats-section" id="research">
        <div className="wrap">
          <div className="section-eyebrow">{fr ? "Pourquoi c'est important" : "Why it matters"}</div>
          <h2 className="section-h">
            {fr
              ? <>La science d&apos;une <span className="gradient">première impression</span></>
              : <>The science of a <span className="gradient">first impression</span></>}
          </h2>
          <p className="section-lede">
            {fr
              ? "Des décennies de recherche montrent que l'apparence du visage façonne la vie quotidienne, de façon mesurable. MogRank transforme ces signaux en actions concrètes."
              : "Decades of research show that facial appearance shapes daily life in measurable ways. MogRank turns those signals into something you can actually act on."}
          </p>
          <div className="stats-grid">
            {([
              { num:"100", unit:"ms", textEn:"Time strangers need to form a stable first impression of trust and competence from a face alone.", textFr:"Le temps qu'il faut à un inconnu pour se forger une impression stable de confiance et de compétence.", src:"Willis & Todorov, 2006" },
              { num:"+14", unit:"%",  textEn:"Average salary premium associated with above-average appearance, across men and women.", textFr:"Prime salariale moyenne associée à une apparence au-dessus de la moyenne, chez les hommes comme chez les femmes.", src:"Hamermesh, 2011" },
              { num:"2.3", unit:"x",  textEn:"More callback interviews for identical resumes paired with attractive photos.", textFr:"Plus de rappels pour des entretiens, à CV identique, avec une photo plus attractive.", src:"Ruffle & Shtudiner, 2015" },
              { num:"68",  unit:"%",  textEn:"Of observers automatically rate attractive faces as more intelligent and sociable.", textFr:"Des observateurs jugent automatiquement les visages attractifs plus intelligents et sociables.", src:"Dion et al., 1972" },
            ] as { num:string; unit:string; textEn:string; textFr:string; src:string }[]).map((s, i) => (
              <div key={i} className="stat">
                <div className="num">{s.num}<small>{s.unit}</small></div>
                <p className="text">{fr ? s.textFr : s.textEn}</p>
                <div className="src">{s.src}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="section" id="how">
        <div className="wrap">
          <div className="section-eyebrow">{fr ? "Comment ça marche" : "How it works"}</div>
          <h2 className="section-h">
            {fr
              ? <>Trois étapes du <span className="gradient">selfie</span> à la stratégie</>
              : <>Three steps from <span className="gradient">selfie</span> to strategy</>}
          </h2>
          <div className="how-grid">
            <div className="how-card">
              <div className="how-num">01</div>
              <h3>{fr ? "Téléchargez votre photo" : "Upload your photo"}</h3>
              <p>{fr ? "Une photo de face nette suffit. Les images sont chiffrées et supprimées après 24 h." : "A clean front-facing shot is all we need. Photos are encrypted and auto-deleted after 24h."}</p>
              <div className="how-illu">
                <svg width="100%" height="60" viewBox="0 0 200 60" fill="none">
                  <rect x="60" y="6" width="80" height="48" rx="8" fill="var(--cream-2)" stroke="var(--ink)" strokeWidth="1.4"/>
                  <path d="M100 38 V20 M93 27 L100 20 L107 27" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <div className="how-card">
              <div className="how-num">02</div>
              <h3>{fr ? "Obtenez votre score" : "Get your score"}</h3>
              <p>{fr ? "Recevez un Score Face global et 12 sous-scores. Chaque chiffre est ancré sur un centile." : "Receive an overall Face Score plus 12 sub-scores. Every number is anchored to a percentile."}</p>
              <div className="how-illu">
                <svg width="100%" height="60" viewBox="0 0 200 60" fill="none">
                  <path d="M40 50 A 60 60 0 0 1 160 50" stroke="var(--cream-3)" strokeWidth="6" fill="none" strokeLinecap="round"/>
                  <path d="M40 50 A 60 60 0 0 1 140 18" stroke="var(--accent)" strokeWidth="6" fill="none" strokeLinecap="round"/>
                  <text x="100" y="46" textAnchor="middle" fontFamily="DM Sans" fontWeight="700" fontSize="22" fill="var(--ink)" letterSpacing="-0.04em">82</text>
                </svg>
              </div>
            </div>
            <div className="how-card">
              <div className="how-num">03</div>
              <h3>{fr ? "Améliorez-vous" : "Improve yourself"}</h3>
              <p>{fr ? "Suivez votre feuille de route personnalisée. Re-scannez chaque jour. La plupart gagnent +6 points en 90 jours." : "Follow your personalized roadmap. Re-scan daily. Most users gain +6 points within 90 days."}</p>
              <div className="how-illu">
                <svg width="100%" height="60" viewBox="0 0 200 60" fill="none">
                  <path d="M10 50 L40 45 L70 48 L100 32 L130 28 L160 16 L190 6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" fill="none"/>
                  <circle cx="190" cy="6" r="4" fill="var(--accent)"/>
                  <circle cx="190" cy="6" r="8" fill="rgba(249,115,22,0.2)"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="final-cta">
        <div className="watermark">face.</div>
        <h2>
          {fr
            ? <>Prêt à voir où <span className="gradient">vous</span> en êtes ?</>
            : <>Ready to see where <span className="gradient">you</span> stand?</>}
        </h2>
        <p>
          {fr
            ? "Scan gratuit. Sans compte. Obtenez votre Score Face en moins de 10 secondes."
            : "Free scan. No account required. Get your Face Score in under 10 seconds."}
        </p>
        <div className="final-cta-buttons">
          <Link href="/upload" className="cta-primary cta-lg">
            {fr ? "Obtenir mon score — c'est gratuit" : "Get my score — it's free"}
            <svg className="arr" width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer>
        <div className="wrap">
          <div className="foot-top">
            <div>
              <a className="brand" href="#" aria-label="MogRank">
                <span className="brand-mark" aria-hidden="true"/>
                <span>MogRank</span>
              </a>
              <p className="foot-blurb">
                {fr
                  ? "Le miroir qui vous dit vraiment la vérité, et vous dit quoi en faire."
                  : "The mirror that tells you the truth, and tells you what to do about it."}
              </p>
            </div>
            <div className="foot-cols">
              <div className="foot-col">
                <h4>{fr ? "Produit" : "Product"}</h4>
                <ul>
                  <li><a href="#how">{fr ? "Comment ça marche" : "How it works"}</a></li>
                  <li><a href="#research">{fr ? "Recherche" : "Research"}</a></li>
                  <li><a href="#">{fr ? "Application mobile" : "Mobile app"}</a></li>
                </ul>
              </div>
              <div className="foot-col">
                <h4>{fr ? "Entreprise" : "Company"}</h4>
                <ul>
                  <li><a href="#">{fr ? "À propos" : "About"}</a></li>
                  <li><a href="#">Blog</a></li>
                  <li><a href="#">Contact</a></li>
                </ul>
              </div>
              <div className="foot-col">
                <h4>{fr ? "Mentions légales" : "Legal"}</h4>
                <ul>
                  <li><a href="#">{fr ? "Confidentialité" : "Privacy"}</a></li>
                  <li><a href="#">{fr ? "Conditions" : "Terms"}</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="foot-bot">
            <div>
              {fr
                ? "© 2026 MogRank Labs. Photos traitées localement quand c'est possible."
                : "© 2026 MogRank Labs. Photos processed locally when possible."}
            </div>
            <div className="mono" style={{ letterSpacing: "0.1em" }}>v3.2 · MOG-ENGINE</div>
          </div>
        </div>
      </footer>

    </div>
  );
}
