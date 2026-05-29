"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "./context/language";
import { useAuth } from "./context/auth";
import "./landing.css";

export default function Home() {
  const { lang, setLang } = useLang();
  const { user, authLoading, signOut } = useAuth();
  const router = useRouter();

  const fr = lang === "fr";

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  // Apply light theme override on <html>
  useEffect(() => {
    document.documentElement.dataset.landing = "1";
    return () => { delete document.documentElement.dataset.landing; };
  }, []);

  return (
    <div className="landing-pg">

      {/* ===== NAV ===== */}
      <nav className="lnav">
        <div className="lwrap lnav-inner">
          <a className="lbrand" href="#">
            <span className="lbrand-mark" aria-hidden="true">M</span>
            <span>MogRank</span>
          </a>
          <div className="lnav-links">
            <a href="#how">{fr ? "Comment ça marche" : "How it works"}</a>
            <a href="#research">{fr ? "Recherche" : "Research"}</a>
          </div>
          <div className="lnav-right">
            {/* Language switch */}
            <div className="llang-switch" role="group" aria-label="Language">
              <button className={`llang-btn${lang === "en" ? " active" : ""}`} onClick={() => setLang("en")} title="English">
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
              <button className={`llang-btn${lang === "fr" ? " active" : ""}`} onClick={() => setLang("fr")} title="Français">
                <svg viewBox="0 0 60 40" aria-hidden="true">
                  <rect width="20" height="40" fill="#002654"/>
                  <rect x="20" width="20" height="40" fill="#fff"/>
                  <rect x="40" width="20" height="40" fill="#ce1126"/>
                </svg>
                <span>FR</span>
              </button>
            </div>

            {/* Auth */}
            {!authLoading && user ? (
              <>
                <span className="lnav-email">{user.email}</span>
                <button onClick={handleSignOut} className="lbtn-ghost">
                  {fr ? "Déconnexion" : "Sign out"}
                </button>
                <Link href="/upload" className="lcta-primary">
                  {fr ? "Analyser" : "Analyze"}
                  <svg className="arr" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="lbtn-ghost">
                  {fr ? "Connexion" : "Login"}
                </Link>
                <Link href="/upload" className="lcta-primary">
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
      <section className="lhero">
        <div className="lwrap lhero-grid">
          <div>
            <div className="ltrust">
              <div className="ltrust-avatars">
                <span style={{ background: "linear-gradient(135deg,#d4a574,#7a5a2a)" }}/>
                <span style={{ background: "linear-gradient(135deg,#f4d4b8,#8b5a2b)" }}/>
                <span style={{ background: "linear-gradient(135deg,#c08a5e,#3d2818)" }}/>
                <span style={{ background: "linear-gradient(135deg,#e8c498,#a06840)" }}/>
              </div>
              <span>
                {fr
                  ? <>{`Aimé par 240 000+ utilisateurs · `}<span className="lstar">★</span>{` 4.9`}</>
                  : <>{`Loved by 240K+ users · `}<span className="lstar">★</span>{` 4.9`}</>}
              </span>
            </div>

            <h1 className="lhero-title">
              <span className="lmeet">{fr ? "Découvrez MogRank" : "Meet MogRank"}</span>
              {fr
                ? <>{`Révélez votre potentiel `}<span className="lgradient">{`en une seule photo.`}</span></>
                : <>{`Discover your potential `}<span className="lgradient">{`with just a photo.`}</span></>}
            </h1>

            <p className="lhero-sub">
              {fr
                ? "MogRank est l'app IA d'analyse faciale instantanée. Téléchargez une photo, obtenez votre score, identifiez vos points faibles et révélez votre meilleure version."
                : "Meet MogRank, the AI-powered app for instant facial analysis. Upload a photo, get your score, find your weak points and unlock your best self."}
            </p>

            <div className="lhero-cta">
              <Link href="/upload" className="lcta-primary lcta-lg">
                {fr ? "Obtenir mon score — c'est gratuit" : "Get my score — it's free"}
                <svg className="arr" width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </div>

          {/* Phone mockups */}
          <div className="lphones">
            {/* Phone 1: scanning */}
            <div className="lphone lphone-1">
              <div className="lphone-screen">
                <div className="lscan-screen">
                  <div className="lscan-statusbar">
                    <span>9:41</span>
                    <div className="licons">
                      <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                        <path d="M1 9V7M5 9V5M9 9V3M13 9V1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
                        <rect x="0.5" y="1" width="18" height="8" rx="2" stroke="currentColor"/>
                        <rect x="2" y="2.5" width="14" height="5" rx="1" fill="currentColor"/>
                        <rect x="19.5" y="3.5" width="1.5" height="3" rx="0.5" fill="currentColor"/>
                      </svg>
                    </div>
                  </div>
                  <div className="lscan-header">
                    <h4>Scanner</h4>
                    <div className="lscan-iconbtn">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="3" cy="7" r="1.3" fill="currentColor"/>
                        <circle cx="7" cy="7" r="1.3" fill="currentColor"/>
                        <circle cx="11" cy="7" r="1.3" fill="currentColor"/>
                      </svg>
                    </div>
                  </div>
                  <div className="lscan-area">
                    <div className="lscan-face"/>
                    <div className="lscan-corner ltl"/>
                    <div className="lscan-corner ltr"/>
                    <div className="lscan-corner lbl"/>
                    <div className="lscan-corner lbr"/>
                    <div className="lscan-beam"/>
                  </div>
                  <div className="lscan-bottom">
                    <div className="lscan-pill">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 2v3M7 9v3M2 7h3M9 7h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                      <span>{fr ? "Scanner le visage" : "Scan face"}</span>
                    </div>
                    <div className="lscan-shutter"/>
                    <div style={{ width: 28 }}/>
                  </div>
                  <div className="lscan-bottombar"/>
                </div>
              </div>
              <div className="lphone-notch"/>
            </div>

            {/* Phone 2: results */}
            <div className="lphone lphone-2">
              <div className="lphone-screen">
                <div className="lresult-screen">
                  <div className="lresult-statusbar">
                    <span>9:41</span>
                    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                      <svg width="12" height="10" viewBox="0 0 14 10" fill="none">
                        <path d="M1 9V7M5 9V5M9 9V3M13 9V1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <svg width="18" height="10" viewBox="0 0 22 10" fill="none">
                        <rect x="0.5" y="1" width="18" height="8" rx="2" stroke="currentColor"/>
                        <rect x="2" y="2.5" width="14" height="5" rx="1" fill="currentColor"/>
                      </svg>
                    </div>
                  </div>
                  <div className="lresult-eyebrow">{fr ? "VOS RÉSULTATS" : "YOUR RESULTS"}</div>
                  <div className="lresult-h">Score Global</div>
                  <div className="lresult-ring">
                    <svg width="108" height="108" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#222" strokeWidth="10"/>
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#f97316" strokeWidth="10" strokeDasharray="314" strokeDashoffset="69" strokeLinecap="round" transform="rotate(-90 60 60)"/>
                      <text x="60" y="56" textAnchor="middle" fill="#f97316" fontSize="26" fontWeight="600" fontFamily="DM Sans" letterSpacing="-1">7.8</text>
                      <text x="60" y="74" textAnchor="middle" fill="#666" fontSize="11" fontFamily="DM Sans">/ 10</text>
                    </svg>
                  </div>
                  <div className="lresult-tier">
                    {fr ? "Note : " : "Tier: "}<span className="lgradient">High Tier</span>
                  </div>
                  <div className="lresult-tier-sub">NIVEAU LOOKSMAX : HIGH TIER</div>
                  <div className="lresult-card">
                    <div className="lresult-card-h">{fr ? "DÉTAIL DES MÉTRIQUES" : "METRICS DETAIL"}</div>
                    {([
                      [fr ? "Symétrie Faciale" : "Facial Symmetry", "8.2 / 10", 82],
                      [fr ? "Définition Mâchoire" : "Jaw Definition", "7.5 / 10", 75],
                      [fr ? "Inclinaison Canthale" : "Canthal Tilt", "8.0 / 10", 80],
                      [fr ? "Ratio Milieu Visage" : "Midface Ratio", "7.9 / 10", 79],
                      [fr ? "Qualité de la Peau" : "Skin Quality", "7.1 / 10", 71],
                    ] as [string, string, number][]).map(([label, val, pct]) => (
                      <div key={label} className="lmetric">
                        <div className="lmetric-head"><span>{label}</span><b>{val}</b></div>
                        <div className="lmetric-bar"><i style={{ width: `${pct}%` }}/></div>
                      </div>
                    ))}
                  </div>
                  <div className="lresult-card">
                    <div className="lresult-card-h">POTENTIEL</div>
                    <div className="lpotential-row">
                      <span>High Tier</span><em>→ Elite</em>
                    </div>
                    <div className="lpotential-bar"><i style={{ width: "78%" }}/></div>
                  </div>
                  <div className="lresult-cta">
                    {fr ? "Voir mon programme complet" : "See my full plan"}
                  </div>
                  <div className="lresult-bottombar"/>
                </div>
              </div>
              <div className="lphone-notch"/>
            </div>

            {/* Floating callouts */}
            <div className="lcallout lcallout-1">
              <div className="lco-l">Face Score</div>
              <div className="lco-v">82<small>/100</small></div>
            </div>
            <div className="lcallout lcallout-2">
              <div className="lco-l">{fr ? "Symétrie" : "Symmetry"}</div>
              <div className="lco-v">94<small>%</small></div>
            </div>
            <div className="lcallout lcallout-3">
              <div className="lco-l">Canthal Tilt</div>
              <div className="lco-v">+5°</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TRANSFORMATIONS ===== */}
      <section className="lsection" id="transformations">
        <div className="lwrap">
          <div className="lsection-eyebrow">{fr ? "Vraies transformations" : "Real transformations"}</div>
          <h2 className="lsection-h">
            {fr
              ? <>{`D'un score à un `}<span className="lgradient">{`nouveau visage`}</span></>
              : <>{`From a score to a `}<span className="lgradient">{`new face`}</span></>}
          </h2>
          <p className="lsection-lede">
            {fr
              ? "De vrais utilisateurs, de vraies évolutions. Chaque transformation suit le plan d'action généré par MogRank après votre scan. Re-scannez chaque mois. Regardez votre score grimper."
              : "Real users, real glow-ups. Each transformation comes from following the action plan MogRank generates after your scan. Re-scan monthly. Watch your score climb."}
          </p>

          <div className="ltransforms-grid">
            {([
              { name: "Lucas · 22", from: "6.1", to: "8.4", tag: fr ? "Mis en avant · 90 jours" : "Featured · 90 days", glow: true, grad: "linear-gradient(160deg,#c4956a 0%,#5a3520 100%)" },
              { name: "Théo · 19",  from: "5.8", to: "7.9", tag: "+2.1", grad: "linear-gradient(160deg,#8b6340 0%,#2d1a0e 100%)" },
              { name: "Adrien · 24",from: "5.2", to: "8.2", tag: "+3.0", grad: "linear-gradient(160deg,#b87a45 0%,#3a2010 100%)" },
              { name: "Mateo · 17", from: "6.3", to: "8.1", tag: "+1.8", grad: "linear-gradient(160deg,#d4956b 0%,#6a3515 100%)" },
              { name: "Erik · 21",  from: "5.7", to: "8.1", tag: "+2.4", grad: "linear-gradient(160deg,#a07050 0%,#40200c 100%)" },
              { name: "Marco · 20", from: "5.9", to: "8.5", tag: "+2.6", grad: "linear-gradient(160deg,#c48050 0%,#5a2810 100%)" },
            ] as { name: string; from: string; to: string; tag: string; glow?: boolean; grad: string }[]).map((c, i) => (
              <div key={i} className="lba-card">
                <div className="lba-bg" style={{ background: c.grad }}/>
                <div className={`lba-tag${c.glow ? " lglow" : ""}`}>
                  <span className="ldot"/><span>{c.tag}</span>
                </div>
                <div className="lba-meta">
                  <div className="lba-name">{c.name}</div>
                  <div className="lba-score">{c.from} <span className="larrow">→</span> <b>{c.to}</b></div>
                </div>
              </div>
            ))}
          </div>

          {/* Features strip */}
          <div className="lfeat-strip-grid">
            {([
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/></svg>,
                h: fr ? "Analyse IA instantanée" : "Instant AI analysis",
                p: fr ? "Prenez une photo. Plus de 40 points traités en moins de 8 secondes." : "Snap a photo. 40+ landmarks and symmetry vectors processed in under 8 seconds.",
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
                h: fr ? "Rapport détaillé" : "Detailed report",
                p: fr ? "12 catégories notées plus les centiles. Voyez exactement où vous en êtes." : "12 categories scored, plus percentile rankings. See exactly where you stand.",
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-4.5-7-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.5-7 11-7 11h-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
                h: fr ? "Conseils personnalisés" : "Personalized tips",
                p: fr ? "Un plan d'action concret adapté à vos traits. Suivez votre progression chaque mois." : "A concrete action plan tailored to your features. Track progress monthly.",
              },
            ] as { icon: React.ReactNode; h: string; p: string }[]).map((f, i) => (
              <div key={i} className="lfeat-strip">
                <div className="lfeat-strip-ico">{f.icon}</div>
                <h3>{f.h}</h3>
                <p>{f.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== RESEARCH STATS ===== */}
      <section className="lstats-section" id="research">
        <div className="lwrap">
          <div className="lsection-eyebrow">{fr ? "Pourquoi c'est important" : "Why it matters"}</div>
          <h2 className="lsection-h">
            {fr
              ? <>{`La science d'une `}<span className="lgradient">{`première impression`}</span></>
              : <>{`The science of a `}<span className="lgradient">{`first impression`}</span></>}
          </h2>
          <p className="lsection-lede">
            {fr
              ? "Des décennies de recherche montrent que l'apparence du visage façonne la vie quotidienne, de façon mesurable. MogRank transforme ces signaux en actions concrètes."
              : "Decades of research show that facial appearance shapes daily life in measurable ways. MogRank turns those signals into something you can actually act on."}
          </p>
          <div className="lstats-grid">
            {([
              { num: "100", unit: "ms", text: fr ? "Le temps qu'il faut à un inconnu pour se forger une impression stable de confiance et de compétence à partir du visage seul." : "Time strangers need to form a stable first impression of trust and competence from a face alone.", src: "Willis & Todorov, 2006" },
              { num: "+14", unit: "%",  text: fr ? "Prime salariale moyenne associée à une apparence au-dessus de la moyenne, chez les hommes comme chez les femmes." : "Average salary premium associated with above-average appearance, across men and women.", src: "Hamermesh, 2011" },
              { num: "2.3", unit: "x",  text: fr ? "Plus de rappels pour des entretiens, à CV identique, avec une photo plus attractive." : "More callback interviews for identical resumes paired with attractive photos.", src: "Ruffle & Shtudiner, 2015" },
              { num: "68",  unit: "%",  text: fr ? "Des observateurs jugent automatiquement les visages attractifs plus intelligents et sociables." : "Of observers automatically rate attractive faces as more intelligent and sociable.", src: "Dion et al., 1972" },
            ] as { num: string; unit: string; text: string; src: string }[]).map((s, i) => (
              <div key={i} className="lstat">
                <div className="lstat-num">{s.num}<small>{s.unit}</small></div>
                <p className="lstat-text">{s.text}</p>
                <div className="lstat-src">{s.src}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="lsection" id="how">
        <div className="lwrap">
          <div className="lsection-eyebrow">{fr ? "Comment ça marche" : "How it works"}</div>
          <h2 className="lsection-h">
            {fr
              ? <>{`Trois étapes du `}<span className="lgradient">{`selfie`}</span>{` à la stratégie`}</>
              : <>{`Three steps from `}<span className="lgradient">{`selfie`}</span>{` to strategy`}</>}
          </h2>
          <div className="lhow-grid">
            {([
              {
                num: "01",
                h: fr ? "Téléchargez votre photo" : "Upload your photo",
                p: fr ? "Une photo de face nette suffit. Les images sont chiffrées et supprimées après 24 h." : "A clean front-facing shot is all we need. Photos are encrypted and auto-deleted after 24h.",
                illu: (
                  <svg width="100%" height="60" viewBox="0 0 200 60" fill="none">
                    <rect x="60" y="6" width="80" height="48" rx="8" fill="#f4eedf" stroke="#0c0b09" strokeWidth="1.4"/>
                    <path d="M100 38 V20 M93 27 L100 20 L107 27" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
              },
              {
                num: "02",
                h: fr ? "Obtenez votre score" : "Get your score",
                p: fr ? "Recevez un Score Face global et 12 sous-scores. Chaque chiffre est ancré sur un centile." : "Receive an overall Face Score plus 12 sub-scores. Every number is anchored to a percentile.",
                illu: (
                  <svg width="100%" height="60" viewBox="0 0 200 60" fill="none">
                    <path d="M40 50 A 60 60 0 0 1 160 50" stroke="#ecdfbf" strokeWidth="6" fill="none" strokeLinecap="round"/>
                    <path d="M40 50 A 60 60 0 0 1 140 18" stroke="#f97316" strokeWidth="6" fill="none" strokeLinecap="round"/>
                    <text x="100" y="46" textAnchor="middle" fontFamily="DM Sans" fontWeight="700" fontSize="22" fill="#0c0b09" letterSpacing="-0.04em">82</text>
                  </svg>
                ),
              },
              {
                num: "03",
                h: fr ? "Améliorez-vous" : "Improve yourself",
                p: fr ? "Suivez votre feuille de route personnalisée. Re-scannez chaque mois. La plupart gagnent +6 points en 90 jours." : "Follow your personalized roadmap. Re-scan monthly. Most users gain +6 points within 90 days.",
                illu: (
                  <svg width="100%" height="60" viewBox="0 0 200 60" fill="none">
                    <path d="M10 50 L40 45 L70 48 L100 32 L130 28 L160 16 L190 6" stroke="#f97316" strokeWidth="2" strokeLinecap="round" fill="none"/>
                    <circle cx="190" cy="6" r="4" fill="#f97316"/>
                    <circle cx="190" cy="6" r="8" fill="rgba(249,115,22,0.2)"/>
                  </svg>
                ),
              },
            ] as { num: string; h: string; p: string; illu: React.ReactNode }[]).map((step, i) => (
              <div key={i} className="lhow-card">
                <div className="lhow-num">{step.num}</div>
                <h3>{step.h}</h3>
                <p>{step.p}</p>
                <div className="lhow-illu">{step.illu}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="lfinal-cta">
        <div className="lwatermark">face.</div>
        <h2>
          {fr
            ? <>{`Prêt à voir où `}<span className="lgradient lit">{`vous`}</span>{` en êtes ?`}</>
            : <>{`Ready to see where `}<span className="lgradient lit">{`you`}</span>{` stand?`}</>}
        </h2>
        <p>
          {fr
            ? "Scan gratuit. Sans compte. Obtenez votre Score Face en moins de 10 secondes."
            : "Free scan. No account required. Get your Face Score in under 10 seconds."}
        </p>
        <div className="lfinal-cta-buttons">
          <Link href="/upload" className="lcta-primary lcta-lg">
            {fr ? "Obtenir mon score — c'est gratuit" : "Get my score — it's free"}
            <svg className="arr" width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="lfooter">
        <div className="lwrap">
          <div className="lfoot-top">
            <div>
              <a className="lbrand" href="#">
                <span className="lbrand-mark" aria-hidden="true">M</span>
                <span>MogRank</span>
              </a>
              <p className="lfoot-blurb">
                {fr
                  ? "Le miroir qui vous dit vraiment la vérité, et vous dit quoi en faire."
                  : "The mirror that tells you the truth, and tells you what to do about it."}
              </p>
            </div>
            <div className="lfoot-cols">
              <div className="lfoot-col">
                <h4>{fr ? "Produit" : "Product"}</h4>
                <ul>
                  <li><a href="#how">{fr ? "Comment ça marche" : "How it works"}</a></li>
                  <li><a href="#research">{fr ? "Recherche" : "Research"}</a></li>
                  <li><a href="#">{fr ? "Application mobile" : "Mobile app"}</a></li>
                </ul>
              </div>
              <div className="lfoot-col">
                <h4>{fr ? "Entreprise" : "Company"}</h4>
                <ul>
                  <li><a href="#">{fr ? "À propos" : "About"}</a></li>
                  <li><a href="#">Blog</a></li>
                  <li><a href="#">Contact</a></li>
                </ul>
              </div>
              <div className="lfoot-col">
                <h4>{fr ? "Mentions légales" : "Legal"}</h4>
                <ul>
                  <li><a href="#">{fr ? "Confidentialité" : "Privacy"}</a></li>
                  <li><a href="#">{fr ? "Conditions" : "Terms"}</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="lfoot-bot">
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
