import Head from "next/head";
import Script from "next/script";
import Link from "next/link";

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function scoreToMood(score) {
  if (score >= 85) return "euphoria";
  if (score >= 70) return "content";
  if (score >= 60) return "optimism";
  if (score >= 45) return "neutral";
  if (score >= 35) return "doubt";
  if (score >= 20) return "concern";
  return "frustration";
}

function formatCompactVolume(volumeUsd) {
  const value = Number(volumeUsd || 0);
  if (!Number.isFinite(value) || value <= 0) return "$--";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9)  return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6)  return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toFixed(0)}`;
}

export default function Home({ ogImageUrl }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://wojakmeter.com/#website",
        name: "WojakMeter",
        url: "https://wojakmeter.com",
        description:
          "WojakMeter is a real-time crypto emotion index that translates market data into sentiment.",
        publisher: { "@id": "https://wojakmeter.com/#org" }
      },
      {
        "@type": "Organization",
        "@id": "https://wojakmeter.com/#org",
        name: "WojakMeter",
        url: "https://wojakmeter.com",
        logo: {
          "@type": "ImageObject",
          url: "https://wojakmeter.com/assets/logo/wojakmeter_logo.png"
        },
        sameAs: ["https://x.com/wojakmeterx"]
      },
      {
        /* Marcado FAQ: hace elegible el bloque de preguntas para
           rich results en Google. Debe coincidir palabra por palabra
           con lo que se ve en pantalla. */
        "@type": "FAQPage",
        "@id": "https://wojakmeter.com/#faq",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is WojakMeter?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "WojakMeter is a crypto sentiment tool that converts market data into a real-time emotional index. It reads price momentum, social sentiment and macro trends, then reports a single score for how the market feels."
            }
          },
          {
            "@type": "Question",
            name: "How does the score work?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Multiple signals are aggregated into a 0-100 reading, mapped across seven emotional states from Frustration to Euphoria. You can view the raw market reading or blend in social, macro and community layers."
            }
          },
          {
            "@type": "Question",
            name: "Why use it instead of a price chart?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "A chart shows what happened. WojakMeter shows how the market reacted to it. Two days with identical price action can carry completely different emotional weight, and that difference is what the index measures."
            }
          }
        ]
      }
    ]
  };

  return (
    <>
      <Head>
        <title>WojakMeter – Crypto Emotion Index | Market Sentiment Tracker</title>
        <meta name="description" content="Track real-time crypto market emotion with WojakMeter. A sentiment index powered by price action, social signals and macro trends." />
        <meta name="keywords" content="wojakmeter, crypto sentiment, crypto emotion index, bitcoin sentiment, crypto market mood, market sentiment tracker, fear and greed alternative, crypto psychology, mood token, dexscreener sentiment, solana token mood" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="WojakMeter" />

        {/* Debe coincidir con --wm-ink-050 del tema. */}
        <meta name="theme-color" content="#0A0F16" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Archivo = display. Inter = cuerpo. IBM Plex Mono = lecturas.
            Rajdhani y Space Grotesk eliminadas. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />

        <link rel="canonical" href="https://wojakmeter.com" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=2" />
        <link rel="shortcut icon" href="/favicon.png?v=2" />

        <meta property="og:title" content="WojakMeter – The Crypto Emotion Index" />
        <meta property="og:description" content="Understand what the crypto market feels like in real-time using WojakMeter." />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:url" content="https://wojakmeter.com" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="WojakMeter" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="WojakMeter – Crypto Emotion Index" />
        <meta name="twitter:description" content="Real-time crypto market emotion powered by price action and sentiment." />
        <meta name="twitter:image" content={ogImageUrl} />
        <meta name="twitter:site" content="@wojakmeterx" />
        <meta name="twitter:creator" content="@wojakmeterx" />
      </Head>

      <Script
        id="wm-structured-data"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Script src="/script.js?v=13" strategy="afterInteractive" />
      <Script src="/wojak-game.js?v=1" strategy="lazyOnload" />
      <Script src="/wm-organism.js?v=2" strategy="afterInteractive" />

      <div className="style-classic">
        <div className="app-shell">

          {/* ===========================================================
              HEADER
          =========================================================== */}
          <header className="topbar cardless wm-sticky-header" id="market">
            {/* ---------- FILA 1: marca, navegación, estilo ----------
                Antes todo iba en una rejilla de tres columnas que
                metía las métricas EN MEDIO del logo y la nav. El
                resultado era el solapamiento que se veía en móvil.
                Ahora son dos filas con papeles claros. */}
            <div className="wm-header-top">
              <button
                type="button"
                className="wm-menu-toggle"
                id="wmMenuToggle"
                aria-label="Open navigation menu"
                aria-expanded="false"
              >
                ☰
              </button>

              <a href="#market" className="wm-brand">
                <img
                  src="/assets/logo/wojakmeter_logo.png"
                  alt="WojakMeter"
                  className="logo-img"
                />
                {/* El eslogan explica qué es el sitio a quien llega
                    por primera vez. El logo solo no lo dice. */}
                <span className="wm-tagline">The Crypto Emotion Index</span>
              </a>

              <nav className="wm-desktop-nav" aria-label="Main navigation">
                <a href="#historySection">History</a>
                <a href="#top-coins">Markets</a>
                <a href="#bagMoodSection">Bag</a>
                <a href="#emotionRadarSection">Radar</a>
                <a href="#wojak-studio">Studio</a>
                <a href="#about">About</a>

                {/* El juego lleva tratamiento propio en el nav, como
                    MOOD: no es una seccion mas de la lista, es lo
                    unico de la pagina con lo que se puede JUGAR. Un
                    enlace de texto plano entre otros seis se pierde. */}
                <a href="#emotionRush" className="wm-nav-play">
                  <span className="wm-nav-play-dot" aria-hidden="true"></span>
                  <span>Play</span>
                </a>

                {/* MOOD al final y destacado: es el token del
                    proyecto, no una sección más de la lista. */}
                <a href="#moodSection" className="wm-nav-mood">
                  <img src="/moodlogo.png" alt="" />
                  <span>MOOD</span>
                </a>
              </nav>

              <div className="wm-header-style">
                <label className="style-label" htmlFor="styleSelector">Style</label>
                <select id="styleSelector" defaultValue="classic">
                  <option value="classic">Classic</option>
                  <option value="synth">Synth</option>
                  <option value="boyak">Boyak</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
            </div>

            {/* ---------- FILA 2: métricas ----------
                Con fila propia dejan de pelear por espacio y caben
                más. La dominancia lleva anillo: un porcentaje sobre
                un total se lee mejor como proporción que como cifra. */}
            <div className="wm-header-metrics" id="wmHeaderMetrics">
              <div className="wm-metric wm-metric-dominance">
                <svg viewBox="0 0 36 36" className="wm-dom-ring" aria-hidden="true">
                  <circle className="wm-dom-track" cx="18" cy="18" r="15.5"></circle>
                  <circle className="wm-dom-fill" id="btcDominanceRing" cx="18" cy="18" r="15.5"></circle>
                </svg>
                <div className="wm-metric-copy">
                  <span>BTC.D</span>
                  <strong id="btcDominance">Reading</strong>
                </div>
              </div>

              <div className="wm-metric">
                <span>Market Cap</span>
                <strong id="headerMarketCap">Reading</strong>
              </div>

              <div className="wm-metric">
                <span>24H Volume</span>
                <strong id="headerVolume">Reading</strong>
              </div>

              {/* Métricas nuevas: dan contexto que antes faltaba. */}
              <div className="wm-metric">
                <span>Market Mood</span>
                <strong id="headerMoodLabel" className="mood-neutral">Neutral</strong>
              </div>

              <div className="wm-metric">
                <span>Index</span>
                <strong id="headerScore">50</strong>
              </div>

              <div className="wm-metric">
                <span>Fear/Greed</span>
                <strong id="headerRegime">Balanced</strong>
              </div>
            </div>

            <nav className="wm-mobile-menu" id="wmMobileMenu">
              <a href="#market">Market Mood</a>
              <a href="#historySection">History</a>
              <a href="#top-coins">Market Sections</a>
              <a href="#bagMoodSection">Bag Mood</a>
              <a href="#emotionRadarSection">Emotion Radar</a>
              <a href="#moodSection">MOOD</a>
              <a href="#wojak-studio">Wojak Studio</a>
              <a href="#emotionScale">Emotional Scale</a>
              <a href="#emotionRush" className="wm-mobile-play">Play Emotion Rush</a>
              <a href="#about">About</a>
              <a href="/terms">Terms</a>
              <a href="/privacy">Privacy</a>
              <a href="/disclaimer">Disclaimer</a>
            </nav>
          </header>

          <div className="ticker-bar" id="tickerBar">
            <span>Reading market…</span>
          </div>

                    <section className="news-banner card" id="newsBanner" aria-label="Crypto news">
  <div className="news-banner-label">
    <span className="news-banner-dot" aria-hidden="true"></span>
    Market Pulse
  </div>
  <div className="news-track-wrap">
    <div className="news-track" id="newsTrack">
      <span className="news-loading">Reading the news…</span>
    </div>
  </div>
</section>

          <main className="dashboard">

            {/* ===========================================================
                1. HERO
                Orden: eyebrow → título → cara → lectura → gauge →
                espectro → vitals → ventana → contexto → avanzado.
                Los controles de modo bajan a un <details> cerrado.
            =========================================================== */}
            <section className="hero card">

              <div className="hero-eyebrow">
                <span className="hero-eyebrow-dot" aria-hidden="true"></span>
                <span id="heroDriverLabel">Market flow / price action</span>
              </div>

              <h2 id="heroTitle">Crypto Market Mood</h2>

              <div className="hero-grid hero-grid-stack">
                <div className="hero-main">

                  <div className="hero-view-toggle" id="heroViewToggle">
                    <button
                      type="button"
                      className="hero-view-btn active"
                      data-hero-view="mood"
                      id="heroViewMoodBtn"
                    >
                      Hero Mood
                    </button>
                    <button
                      type="button"
                      className="hero-view-btn"
                      data-hero-view="bubble"
                      id="heroViewBubbleBtn"
                    >
                      Bubble Maps
                    </button>
                  </div>

                  {/* ── VISTA: CARA ── */}
                  <div id="heroMoodView" className="hero-mood-view">
                    <div className="wojak-stage">

                      <div className="hero-social-wrapper" id="socialWrapper">
                        <div
                          className="hero-social-badge social-neutral"
                          id="socialBubble"
                          aria-label="Social sentiment"
                          role="button"
                          tabIndex={0}
                        >
                          <div className="hero-social-badge-label">𝕏</div>
                          <div className="hero-social-badge-icon">
                            <img
                              id="socialIconImg"
                              className="mood-icon-img anim-float"
                              src="/assets/icons/classic/neutral.png"
                              alt="Social mood"
                            />
                          </div>
                          <div className="hero-social-badge-text">
                            <span id="socialMoodMini">Neutral</span>
                            <strong id="socialScoreMini">50</strong>
                          </div>
                        </div>

                        <div className="social-expand hidden" id="socialExpand">
                          <div className="social-expand-content">
                            <div className="social-expand-row">
                              <strong>Social Mood</strong>
                              <span id="socialExpandMood">Neutral</span>
                            </div>
                            <div className="social-expand-row">
                              <strong>Social Score</strong>
                              <span id="socialExpandScore">50</span>
                            </div>
                            <div className="social-expand-row">
                              <strong>Interactions</strong>
                              <span id="socialExpandEngagement">Reading</span>
                            </div>
                            <div className="social-expand-row">
                              <strong>Bullish</strong>
                              <span id="socialExpandBullish">Reading</span>
                            </div>
                            <div className="social-expand-row">
                              <strong>Bearish</strong>
                              <span id="socialExpandBearish">Reading</span>
                            </div>
                            <div className="social-expand-row">
                              <strong>Neutral</strong>
                              <span id="socialExpandNeutral">Reading</span>
                            </div>
                            <div className="social-expand-row">
                              <strong>Window</strong>
                              <span id="socialExpandWindow">24h</span>
                            </div>
                            <div className="social-expand-note">
                              Social mood is derived from aggregated market sentiment
                              across X, trending coins and meme activity.
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="hero-timeline-backdrop hidden" id="heroTimelineBackdrop">
                        <svg viewBox="0 0 900 280" preserveAspectRatio="none" aria-hidden="true">
                          <path id="heroTimelineArea" d=""></path>
                          {/* Referencia en 50: da arriba y abajo a la curva. */}
                          <path id="heroTimelineMid" d=""></path>
                          <path id="heroTimelineLine" d=""></path>
                        </svg>
                      </div>

                      <div id="heroFaceWrap" className="hero-face-wrap anim-float">
                        <img
                          id="heroFaceImg"
                          className="hero-face-img"
                          src="/assets/hero/classic/neutral.png"
                          alt="Global market mood"
                        />
                        <img
                          id="heroFaceOverlayImg"
                          className="hero-face-overlay hidden"
                          src=""
                          alt=""
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── VISTA: MAPA ── */}
                  <div id="bubbleMapsView" className="bubble-maps-view hidden">
                    <div className="bubble-map-head">
                      <div>
                        <span className="bubble-map-eyebrow">Emotional gravity</span>
                        <strong>Bubble Maps</strong>
                        <p>Every asset placed by what it feels, sized by what it weighs.</p>
                      </div>
                      <button id="bubbleExpandBtn" type="button" className="action-btn">
                        Expand map
                      </button>
                    </div>

                    <div className="bubble-map-legend">
                      <span className="legend-item frustration">Frustration</span>
                      <span className="legend-item concern">Concern</span>
                      <span className="legend-item doubt">Doubt</span>
                      <span className="legend-item neutral">Neutral</span>
                      <span className="legend-item optimism">Optimism</span>
                      <span className="legend-item content">Content</span>
                      <span className="legend-item euphoria">Euphoria</span>
                    </div>

                    <div className="bubble-map-info-row">
                      <div>
                        <strong id="bubbleGlobalMood">Neutral</strong>
                        <span>Global Mood</span>
                      </div>
                      <div>
                        <strong id="bubbleGlobalScore">50</strong>
                        <span>Emotion Score</span>
                      </div>
                      <div>
                        <strong id="bubbleAssetCount">Top 0</strong>
                        <span>Live Assets</span>
                      </div>
                    </div>

                    <div id="bubbleMapStage" className="bubble-map-stage">
                      <div className="bubble-zone bubble-zone-top">Euphoria / Optimism</div>
                      <div className="bubble-zone bubble-zone-mid">Neutral / Doubt</div>
                      <div className="bubble-zone bubble-zone-bottom">Concern / Frustration</div>
                    </div>
                  </div>

                  {/* ── LA LECTURA ── */}
                  <div className="hero-mood mood-neutral" id="heroMood">Neutral</div>

                  <div className="hero-subtitle" id="heroSubtitle">
                    Market emotion is balanced for now.
                  </div>

                  {/* Conservado por compatibilidad con script.js.
                      El tema lo reduce a línea de contexto: el número
                      grande vive solo en el gauge. */}
                  <div className="hero-score hero-score-compact" id="heroScoreWrap">
                    Score: <span id="heroScore">50</span> / 100
                  </div>

                  {/* ── VENTANA TEMPORAL Y CONTEXTO ──

                      SUBIDOS AQUI desde el final del bloque hero.

                      Antes vivian despues del gauge, el espectro y el
                      heartbeat: para ver en que ventana estabas mirando
                      habia que pasar por delante de tres modulos. El
                      orden decia que el timeframe era un detalle, cuando
                      en realidad es lo que da sentido a todo lo de
                      arriba —la cara y el score responden a esa ventana.

                      Ahora la secuencia se lee entera: cara, estado,
                      score, en que ventana, y cuanto se movio. */}
                  <div className="timeframes hero-timeframes" id="heroTimeframes">
                    <button data-timeframe="1h">1h</button>
                    <button data-timeframe="4h">4h</button>
                    <button data-timeframe="24h" className="active">24h</button>
                    <button data-timeframe="7d">7d</button>
                    <button data-timeframe="30d">30d</button>
                  </div>

                  <div className="hero-market-line">
                    <div className="hero-line-item">
                      <span>Market Change</span>
                      <strong id="globalMarketChange">Reading</strong>
                    </div>
                    <div className="hero-line-sep"></div>
                    <div className="hero-line-item">
                      <span>Volume</span>
                      <strong id="globalMarketVolume" className="header-accent">Reading</strong>
                    </div>
                    <div className="hero-line-sep"></div>
                    <div className="hero-line-item">
                      <span>Timeframe</span>
                      <strong id="globalMarketTimeframe">24h</strong>
                    </div>
                  </div>

                  {/* ── GAUGE: lectura principal ── */}
                  <section className="wm-gauge-shell" id="wmGaugeShell">
                    <div className="wm-gauge-head">
                      <div className="wm-gauge-title">WojakMeter Engine</div>
                      <div className="wm-gauge-score">
                        Final Score <strong id="gaugeScoreHead">50</strong>/100
                      </div>
                    </div>
                    <div className="wm-gauge-wrap">
                      <svg
                        className="wm-gauge-svg"
                        viewBox="0 0 300 190"
                        preserveAspectRatio="xMidYMid meet"
                        aria-hidden="true"
                      >
                        <path className="gauge-track" d="M30 150 A120 120 0 0 1 270 150"></path>
                        <path id="gaugeFill" d="M30 150 A120 120 0 0 1 270 150"></path>
                      </svg>
                      <div className="gauge-needle-wrap">
                        <div className="gauge-needle" id="gaugeNeedle"></div>
                      </div>
                      <div className="gauge-center-cap"></div>
                      <div className="gauge-score-center">
                        <div id="gaugeScore">50</div>
                        <div id="gaugeMood">Neutral</div>
                      </div>
                    </div>
                  </section>

                  {/* ── ESPECTRO ── */}
                  <section
                    className="emotion-bar-inline emotion-bar-inline-minimal"
                    id="emotionBarSection"
                  >
                    <div className="emotion-track-wrap">
                      <div className="emotion-track emotion-track-gradient" id="emotionTrack">
                        <div
                          className="emotion-pointer"
                          id="emotionPointer"
                          aria-label="Current position on the emotional spectrum"
                        >
                          <div className="emotion-pointer-arrow"></div>
                          <div className="emotion-pointer-face">
                            <img
                              id="emotionPointerImg"
                              src="/assets/icons/classic/neutral.png"
                              alt="Current emotional state"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* ── SIGNOS VITALES: la firma ── */}
                  <div className="heartbeat-wrap" id="heartbeatWrap">
                    <div className="heartbeat-chart">
                      <svg viewBox="0 0 320 56" preserveAspectRatio="none" aria-hidden="true">
                        <path id="heartbeatPath" d=""></path>
                      </svg>
                    </div>
                  </div>

                  <div className="hero-share-row">
                    <button id="shareMoodBtn" className="action-btn share-x-btn" type="button">
                      Share mood on X
                    </button>
                  </div>

                  {/* ── PANEL AVANZADO ──
                      <details> nativo: accesible por teclado y funciona
                      sin JS. Antes esto bloqueaba la lectura. */}
                  <details className="hero-advanced" id="heroAdvanced">
                    <summary className="hero-advanced-toggle">
                      How this score is built
                    </summary>

                    <div className="hero-advanced-body">
                      <div className="hero-modes" id="heroModes">
                        <button
                          type="button"
                          className="hero-mode-btn active"
                          data-hero-mode="raw"
                          id="heroModeRaw"
                        >
                          Raw Market
                        </button>
                        <button
                          type="button"
                          className="hero-mode-btn"
                          data-hero-mode="composite"
                          id="heroModeComposite"
                        >
                          Composite
                        </button>
                        <button
                          type="button"
                          className="hero-mode-btn"
                          data-hero-mode="custom"
                          id="heroModeCustom"
                        >
                          Custom Layers
                        </button>
                      </div>

                      <section className="wm-layers disabled-layers" id="wmLayers">
                        <div className="layer-title">
                          Toggle layers to see how each force affects the hero
                        </div>
                        <div className="layer-buttons" id="layerButtons">
                          <button type="button" className="layer-btn active" data-layer="market" id="toggleLayerMarket">Market Mood</button>
                          <button type="button" className="layer-btn" data-layer="social" id="toggleLayerSocial">Social Mood</button>
                          <button type="button" className="layer-btn" data-layer="driver" id="toggleLayerDriver">Market Driver</button>
                          <button type="button" className="layer-btn" data-layer="pulse" id="toggleLayerPulse">Emotion Pulse</button>
                        </div>
                        <div className="layer-grid">
                          <div className="layer-card">
                            <span className="layer-card-label">Market</span>
                            <strong className="layer-card-score" id="layerScoreMarket">50</strong>
                            <div className="layer-mini-bar"><span id="layerBarMarket"></span></div>
                            <div className="layer-impact" id="layerImpactMarket">Base</div>
                          </div>
                          <div className="layer-card">
                            <span className="layer-card-label">Social</span>
                            <strong className="layer-card-score" id="layerScoreSocial">50</strong>
                            <div className="layer-mini-bar"><span id="layerBarSocial"></span></div>
                            <div className="layer-impact" id="layerImpactSocial">+0</div>
                          </div>
                          <div className="layer-card">
                            <span className="layer-card-label">Driver</span>
                            <strong className="layer-card-score" id="layerScoreDriver">50</strong>
                            <div className="layer-mini-bar"><span id="layerBarDriver"></span></div>
                            <div className="layer-impact" id="layerImpactDriver">+0</div>
                          </div>
                          <div className="layer-card">
                            <span className="layer-card-label">Pulse</span>
                            <strong className="layer-card-score" id="layerScorePulse">50</strong>
                            <div className="layer-mini-bar"><span id="layerBarPulse"></span></div>
                            <div className="layer-impact" id="layerImpactPulse">+0</div>
                          </div>
                        </div>
                      </section>
                    </div>
                  </details>
                </div>

                {/* ── DRIVERS ── */}
                <section className="drivers-card card">
                  <div className="section-head"><h3>Market Drivers</h3></div>

                  <div className="drivers-controls">
                    <label htmlFor="macroDriver">Main macro driver</label>
                    <select id="macroDriver" defaultValue="market_flow">
                      <option value="market_flow">Market flow / price action</option>
                      <option value="etf_adoption">ETF / institutional adoption</option>
                      <option value="rate_hike">Rate hike fears</option>
                      <option value="rate_cut">Rate cut hopes</option>
                      <option value="regulation_crackdown">Regulation crackdown</option>
                      <option value="crypto_hack">Crypto hack / insolvency</option>
                      <option value="war_escalation">War escalation</option>
                      <option value="neutral_macro">Neutral macro environment</option>
                    </select>
                  </div>

                  <div className="driver-list">
                    <div className="driver-item">
                      <span>Macro Driver</span>
                      <strong id="driverMacro">Market flow / price action</strong>
                    </div>
                    <div className="driver-item">
                      <span>Main Narrative</span>
                      <strong id="driverNarrative">Reading live market data.</strong>
                    </div>
                    <div className="driver-item">
                      <span>Timeframe Reaction</span>
                      <strong id="driverTimeframeReaction">Balanced reaction</strong>
                    </div>
                    <div className="driver-item">
                      <span>Risk Tone</span>
                      <strong id="driverRiskTone">Neutral</strong>
                    </div>
                  </div>
                </section>
              </div>
            </section>

            {/* ===========================================================
                3. HISTÓRICO DE EMOCIÓN
            =========================================================== */}
            <section className="history-section card" id="historySection">
              <div className="section-head">
                <div>
                  <span className="section-kicker">Emotion over time</span>
                  <h3>Market Mood History</h3>
                </div>
                <div className="timeframes compact" id="historyRanges">
                  <button type="button" data-history-range="24h">24h</button>
                  <button type="button" data-history-range="7d" className="active">7d</button>
                  <button type="button" data-history-range="30d">30d</button>
                  <button type="button" data-history-range="90d">90d</button>
                </div>
              </div>

              {/* ---------- LECTURA PRINCIPAL ----------
                  Score actual y cambio del periodo juntos. El cambio
                  es lo primero que pregunta cualquiera al ver una
                  serie temporal, y no estaba en ninguna parte. */}
              <div className="history-headline">
                <div className="history-now">
                  <strong id="historyCurrent" className="mood-neutral">--</strong>
                  <span id="historyCurrentMood" className="mood-neutral">Neutral</span>
                </div>
                <div className="history-delta">
                  <span>Change</span>
                  <strong id="historyChange" className="neutral">--</strong>
                </div>
              </div>

              <div className="history-streak" id="historyStreak">Building history…</div>

              {/* ---------- GRÁFICO ---------- */}
              <div className="history-chart" id="historyChart">
                {/* Sin preserveAspectRatio: el viewBox lo fija el JS
                    con el tamaño real, y así el texto de las bandas
                    y los ejes no se deforma. */}
                <svg id="historySvg" viewBox="0 0 900 300">
                  <g className="history-bands" id="historyBands"></g>
                  <path id="historyArea" d=""></path>
                  <path id="historyLine" d=""></path>
                  <g className="history-axis history-axis-y" id="historyAxisY"></g>
                  <g className="history-axis history-axis-x" id="historyAxisX"></g>
                  <g className="history-crosshair" id="historyCrosshair"></g>
                </svg>

                <div className="chart-tooltip hidden" id="historyTooltip"></div>

                <div className="history-placeholder">
                  Collecting readings every 15 minutes. The chart fills in as history builds.
                </div>
              </div>

              {/* ---------- MÉTRICAS ----------
                  Mínimo, media y máximo describen la distribución
                  pero no el comportamiento. Estas sí. */}
              <div className="history-metrics">
                <div className="history-metric">
                  <span>Range</span>
                  <strong id="historyRange2">--</strong>
                </div>
                <div className="history-metric">
                  <span>Average</span>
                  <strong id="historyAvg">--</strong>
                </div>
                <div className="history-metric" title="Standard deviation of the score. How much the mood swings.">
                  <span>Volatility</span>
                  <strong id="historyVolatility">--</strong>
                  <em id="historyVolatilityLabel">--</em>
                </div>
                <div className="history-metric" title="How many times the market crossed from one emotional state to another.">
                  <span>Mood shifts</span>
                  <strong id="historyFlips">--</strong>
                </div>
                <div className="history-metric" title="Longest continuous stretch in a single emotional state.">
                  <span>Longest streak</span>
                  <strong id="historyStreakLen">--</strong>
                  <em id="historyStreakMood">--</em>
                </div>
                <div className="history-metric" title="Share of the period that has actual readings. Low coverage means gaps.">
                  <span>Coverage</span>
                  <strong id="historyCoverage">--</strong>
                  <em id="historySamples">Collecting…</em>
                </div>
              </div>
            </section>

            {/* ===========================================================
                2. MARKET SECTIONS + CHART
            =========================================================== */}
            <section className="top-coins card" id="top-coins">
              <div className="section-head">
                <h3>Market Sections</h3>
                <div className="market-section-tools">
                  <span className="muted">Live market overview</span>
                  <select id="marketSortSelect" className="market-control-select" defaultValue="marketCap">
                    <option value="marketCap">Market Cap</option>
                    <option value="volume">Volume</option>
                    <option value="change24h">24H %</option>
                    <option value="emotion">Emotion</option>
                    <option value="score">Score</option>
                    <option value="name">Name</option>
                  </select>
                  <select id="marketEmotionFilter" className="market-control-select" defaultValue="all">
                    <option value="all">All emotions</option>
                    <option value="frustration">Frustration</option>
                    <option value="concern">Concern</option>
                    <option value="doubt">Doubt</option>
                    <option value="neutral">Neutral</option>
                    <option value="optimism">Optimism</option>
                    <option value="content">Content</option>
                    <option value="euphoria">Euphoria</option>
                  </select>
                </div>
              </div>

              <div className="tabs-row" id="marketTabs">
                <button className="tab-btn active" data-tab="coins">Top 20 Coins</button>
                <button className="tab-btn" data-tab="trending">Trending</button>
                <button className="tab-btn" data-tab="memes">Meme Coins</button>
              </div>

              <div className="tab-panel active" id="tab-coins">
                <div className="coins-grid" id="coinsGrid"></div>
              </div>
              <div className="tab-panel" id="tab-trending">
                <div className="coins-grid" id="trendingGrid"></div>
              </div>
              <div className="tab-panel" id="tab-memes">
                <div className="coins-grid" id="memesGrid"></div>
              </div>

              {/* ── CHART ── */}
              <div className="inline-chart-wrap" id="inlineChartWrap">
                <div className="chart-card card">
                  <div className="chart-topbar">
                    <div className="chart-coin-meta">
                      <div className="chart-coin-icon-wrap">
                        <img id="chartCoinIcon" className="chart-coin-icon" src="" alt="" />
                      </div>
                      <div className="chart-coin-copy">
                        <div className="chart-coin-title-line">
                          <h3 id="chartTitle">BTC / Bitcoin</h3>
                          <span className="muted" id="chartRenderMode">Line chart</span>
                        </div>
                        <div className="chart-coin-stats">
                          <div className="chart-mini-stat"><span>Price</span><strong id="chartCoinPrice">Reading</strong></div>
                          <div className="chart-mini-stat"><span>Volume</span><strong id="chartCoinVolume">Reading</strong></div>
                          <div className="chart-mini-stat"><span>Market Cap</span><strong id="chartCoinMarketCap">Reading</strong></div>
                        </div>
                      </div>
                    </div>

                    <div className="chart-toolbar">
                      <div className="timeframes compact" id="chartTimeframes">
                        <button data-timeframe="1h">1h</button>
                        <button data-timeframe="4h">4h</button>
                        <button data-timeframe="24h" className="active">24h</button>
                        <button data-timeframe="7d">7d</button>
                        <button data-timeframe="30d">30d</button>
                      </div>
                      <div className="chart-mode-switch" id="chartModeSwitch">
                        <button className="chart-mode-btn active" data-mode="line">Line</button>
                        <button className="chart-mode-btn" data-mode="candle">Candles</button>
                      </div>
                    </div>
                  </div>

                  <div className="chart-inline-moods">
                    <div className="chart-mood-chip">
                      <img
                        id="coinMoodIconImg"
                        className="chart-mood-chip-icon mood-icon-img anim-float"
                        src="/assets/icons/classic/neutral.png"
                        alt=""
                      />
                      <div><span>Technical</span><strong id="coinMoodLabel">Neutral</strong></div>
                    </div>
                    <div className="chart-mood-chip">
                      <img
                        id="detailSocialIconImg"
                        className="chart-mood-chip-icon mood-icon-img anim-float"
                        src="/assets/icons/classic/neutral.png"
                        alt=""
                      />
                      <div><span>Social</span><strong id="detailSocialLabel">Neutral</strong></div>
                    </div>
                    <div className="chart-mood-chip chart-mood-chip-performance">
                      <div><span>Performance</span><strong id="selectedPerformance">Reading</strong></div>
                    </div>
                  </div>

                  {/* Sin preserveAspectRatio: el viewBox lo fija el JS con
                      el tamaño real en píxeles. Ese atributo era lo que
                      estiraba el lienzo y achataba las velas. */}
                  <div className="chart-plot" id="chartPlot">
                    <div className="chart-time-label" id="chartTimeLabel">
                      24h &middot; drag to pan, scroll to zoom
                    </div>

                    <svg id="coinChartSvg" viewBox="0 0 900 340">
                      {/* El orden define el apilado. */}
                      <g className="chart-grid" id="chartGrid"></g>
                      <g className="chart-volume" id="chartVolume"></g>
                      <g className="chart-body" id="chartBody"></g>
                      <g className="chart-last-price" id="chartLastPrice"></g>
                      <g className="chart-axis chart-axis-y" id="chartAxisY"></g>
                      <g className="chart-axis chart-axis-x" id="chartAxisX"></g>
                      <g className="chart-crosshair" id="chartCrosshair"></g>
                    </svg>

                    {/* Tooltip en HTML, no en SVG: el texto se maqueta
                        mejor y hereda la tipografía del sitio. */}
                    <div className="chart-tooltip hidden" id="chartTooltip"></div>
                  </div>

                  <div className="chart-footer">
                    <div className="muted"><span id="selectedTimeframe">24h</span></div>
                  </div>

                  <div className="market-intervals">
                    <div className="interval-box"><span>1h</span><strong id="perf1h">Reading</strong></div>
                    <div className="interval-box"><span>4h</span><strong id="perf4h">Reading</strong></div>
                    <div className="interval-box"><span>24h</span><strong id="perf24h">Reading</strong></div>
                    <div className="interval-box"><span>7d</span><strong id="perf7d">Reading</strong></div>
                    <div className="interval-box"><span>30d</span><strong id="perf30d">Reading</strong></div>
                  </div>

                  <div className="market-exchange-layout">
                    <section className="exchange-card card">
                      <div className="exchange-card-head">
                        <div>
                          <span className="section-kicker">Live markets</span>
                          <h3>Where to trade</h3>
                        </div>
                        <span className="muted">Active pairs for selected coin</span>
                      </div>
                      <div className="exchange-list" id="coinExchangeList">
                        <div className="exchange-loading">Reading exchange pairs…</div>
                      </div>
                    </section>

                    <section className="exchange-card card">
                      <div className="exchange-card-head">
                        <div>
                          <span className="section-kicker">Exchange flow</span>
                          <h3>Top exchange mood</h3>
                        </div>
                        <span className="muted">Global liquidity sentiment</span>
                      </div>
                      <div className="exchange-list" id="topExchangeList">
                        <div className="exchange-loading">Reading exchanges…</div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </section>

            {/* ===========================================================
                3. BAG MOOD
            =========================================================== */}
            <section className="bag-mood-section card" id="bagMoodSection">
              <div className="section-head">
                <div>
                  <h3>Bag Mood</h3>
                  <span className="muted">Your portfolio, and how it feels.</span>
                </div>
                <div className="bag-style-control">
                  <label htmlFor="bagStyleSelector">Style</label>
                  <select id="bagStyleSelector" defaultValue="classic">
                    <option value="classic">Classic</option>
                    <option value="synth">Synth</option>
                    <option value="boyak">Boyak</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>
              </div>

              {/* ---------- CABECERA ----------
                  Personaje y cifras juntos. Antes el personaje tenía un
                  recuadro de 350px para él solo y las métricas iban debajo
                  en cuatro cajas. */}
              <div className="bag-header">
                <div className="bag-hero">
                  <img
                    id="bagMoodHeroImg"
                    className="bag-mood-hero-img anim-float"
                    src="/assets/hero/classic/neutral.png"
                    alt="Your bag mood"
                  />
                </div>

                <div className="bag-headline">
                  <span className="bag-mode-tag" id="bagMoodModeLabel">Portfolio Mood</span>
                  <strong id="bagMoodTitle" className="mood-neutral">Neutral</strong>

                  {/* El PNL es LA cifra: es lo que la gente viene a mirar.
                      Antes tenía el mismo peso visual que "Total Invested". */}
                  <div className="bag-pnl-hero">
                    <strong id="bagPortfolioPnlPercent" className="neutral">+0.00%</strong>
                    <span id="bagPortfolioPnl" className="neutral">$0.00</span>
                  </div>

                  <div className="bag-headline-sub">
                    <span>Value <strong id="bagPortfolioValue">$0.00</strong></span>
                    <span>Invested <strong id="bagTotalInvested">$0.00</strong></span>
                    <span>Score <strong id="bagMoodScore">50/100</strong></span>
                  </div>
                </div>
              </div>

              {/* ---------- BARRA DE ASIGNACIÓN ----------
                  Cada tramo coloreado por el mood de esa posición: cuenta a
                  la vez cuánto pesa y cómo va. */}
              <div className="bag-allocation">
                <div className="bag-allocation-bar" id="bagAllocationBar"></div>
              </div>

              <div className="bag-mode-tabs">
                <button type="button" className="active" data-bag-mode="portfolio">Portfolio</button>
                <button type="button" data-bag-mode="single">Single coin</button>
              </div>

              {/* ---------- AÑADIR POSICIÓN ----------
                  Los tres campos en una fila en escritorio. Antes eran tres
                  filas apiladas incluso con espacio de sobra. */}
              <div className="bag-add-form">
                <div className="bag-search-wrap">
                  <input
                    id="bagSearchInput"
                    type="text"
                    placeholder="Search BTC, SOL, MOOD or paste a contract"
                    autoComplete="off"
                  />
                  {/* Capa flotante: no empuja el contenido. */}
                  <div id="bagSearchResults" className="bag-search-results"></div>
                </div>
                <input id="bagValueInput" type="number" min="0" step="any" placeholder="USD invested" />
                <input id="bagEntryPriceInput" type="number" min="0" step="any" placeholder="Entry price" />
                <button id="bagSearchBtn" type="button" className="action-btn bag-add-btn">Add</button>
              </div>

              <p className="bag-privacy-note">
                Calculated from your entry price against the live market price. Nothing leaves your browser.
              </p>

              {/* ---------- POSICIONES ---------- */}
              <div id="bagMoodList" className="bag-mood-list">
                <div className="bag-empty">Build your bag to see what it feels like.</div>
              </div>

              <div className="bag-actions">
                <button id="bagShareBtn" type="button" className="action-btn share-x-btn">
                  Share Bag Mood
                </button>
                <button id="bagResetBtn" type="button" className="action-btn">Reset</button>
              </div>

              {/* Conservado por compatibilidad con script.js. */}
              <span id="bagMoodChange" className="hidden">+0.00%</span>
              <span id="bagMoodTimeframe" className="hidden">Entry</span>
            </section>

            {/* ===========================================================
                4. EMOTION RADAR
            =========================================================== */}
            <section className="emotion-radar card" id="emotionRadarSection">
              <div className="emotion-radar-head">
                <span className="section-kicker">Live narrative pulse</span>
                <h2>Internet Emotion Radar</h2>
                <p>
                  How the market feels about what's happening right now.
                  Tap a headline, or test your own text.
                </p>
              </div>

              <div className="radar-layout">

                {/* ---------- COLUMNA IZQUIERDA: TITULARES EN VIVO ----------
                    Lo primero, porque es lo que no requiere que el usuario
                    aporte nada. Una sección que empieza pidiendo trabajo
                    pierde a la mayoría antes de demostrar su valor. */}
                <div className="radar-feed">
                  <div className="radar-feed-head">
                    <span className="radar-feed-label">Live headlines</span>
                    <span className="radar-feed-hint">Tap to analyze</span>
                  </div>

                  <div className="radar-news-list" id="radarNewsList">
                    <div className="radar-news-empty">Loading live headlines…</div>
                  </div>

                  {/* Caja de texto plegada: sigue disponible, ya no domina. */}
                  <details className="radar-custom">
                    <summary>Test your own text</summary>

                    <textarea
                      id="emotionRadarInput"
                      placeholder="Paste a headline, tweet or narrative…"
                      rows={4}
                    ></textarea>

                    <div className="emotion-radar-actions">
                      <button id="translateEmotionBtn" className="action-btn" type="button">
                        Analyze
                      </button>
                      <button id="clearEmotionRadarBtn" className="ghost-btn" type="button">
                        Clear
                      </button>
                    </div>

                    <div className="emotion-radar-examples">
                      <button type="button" data-radar-example="Bitcoin ETF delayed again">ETF delay</button>
                      <button type="button" data-radar-example="Solana network outage halts transactions">Outage</button>
                      <button type="button" data-radar-example="AI coins are pumping hard">AI coins</button>
                      <button type="button" data-radar-example="Memecoin season is back">Memecoins</button>
                    </div>
                  </details>
                </div>

                {/* ---------- COLUMNA DERECHA: LECTURA ---------- */}
                <div className="radar-result" id="emotionRadarResult">
                  <div className="radar-result-top">
                    <div className="radar-face-wrap">
                      <img id="radarMoodImg" src="/assets/hero/classic/neutral.png" alt="Narrative emotion" />
                    </div>
                    <div className="radar-result-id">
                      <span className="radar-label">Detected emotion</span>
                      <h3 id="radarMoodLabel" className="mood-neutral">Neutral</h3>
                      <div className="radar-score">
                        <strong id="radarScore">50</strong>
                        <span>/100</span>
                      </div>
                    </div>
                  </div>

                  <div className="radar-meter"><div id="radarMeterFill"></div></div>

                  {/* Desglose de señales: convierte una caja negra en algo
                      que el usuario puede cuestionar. Sin esto, el score es
                      una afirmación sin respaldo. */}
                  <div className="radar-signals" id="radarSignals">
                    <span className="sig neu">no strong signals detected</span>
                  </div>

                  <div className="radar-output-grid">
                    <div><span>Modifier</span><strong id="radarModifier">Waiting</strong></div>
                    <div><span>Intensity</span><strong id="radarIntensity">0%</strong></div>
                    <div><span>Momentum</span><strong id="radarMomentum">Idle</strong></div>
                  </div>

                  <div className="radar-interpretation">
                    <span>Crowd interpretation</span>
                    <p id="radarInterpretation">
                      Tap a headline to read its emotional temperature.
                    </p>
                  </div>

                  {/* El contexto de mercado va SEPARADO del score. Antes el
                      Fear &amp; Greed movía el número hasta 12 puntos, así que
                      el mismo titular puntuaba distinto según el día y la
                      lectura dejaba de ser verificable. */}
                  <div className="radar-context hidden" id="radarContext"></div>

                  <a href="#" id="radarSourceLink" className="radar-source-link hidden"
                     target="_blank" rel="noopener noreferrer">Read source</a>
                </div>
              </div>
            </section>

            {/* ===========================================================
                5. MOOD TOKEN
            =========================================================== */}
            <section className="mood-token-card card" id="moodSection">
              <div className="section-head">
                <div className="mood-section-logo-wrap">
                  <img src="/moodlogo.png" alt="MOOD" className="mood-section-logo" />
                </div>
                <span className="muted">Reactive token mood engine</span>
              </div>

              <div className="mood-token-copy">
                <span className="about-label">MOOD Live</span>
                <h2 className="about-title">Watch any Solana token react in real time.</h2>
              </div>

              {/* ---------- BUSCADOR ---------- */}
              <div className="mood-search-row">
                <input
                  id="tokenSearchInput"
                  type="text"
                  placeholder="Paste a Solana token address"
                  className="mood-input"
                />
                <button id="tokenSearchBtn" className="action-btn" type="button">Load</button>
                {/* El logo en vez del texto: es la marca del token, y como
                    botón se reconoce antes que una palabra en mayúsculas.
                    El aria-label mantiene la accesibilidad, porque una
                    imagen sola no dice nada a un lector de pantalla. */}
                <button
                  id="loadMoodMain"
                  className="action-btn mood-logo-btn"
                  type="button"
                  aria-label="Load MOOD token"
                  title="Load MOOD token"
                >
                  <img src="/moodlogo.png" alt="MOOD" />
                </button>
              </div>

              {/* ---------- TENDENCIAS ---------- */}
              <div className="mood-strip-block">
                <div className="mood-strip-head">
                  <span className="mood-strip-label">Trending now</span>
                  <span className="mood-strip-hint">Tap to load</span>
                </div>
                <div className="mood-trending-strip" id="moodTrendingStrip">
                  <div className="mood-trending-empty">Loading…</div>
                </div>
              </div>

              {/* ---------- HISTÓRICO DE REACCIONES ----------
                  Oculto hasta que haya algo: una sección vacía diciendo "aún
                  no hay nada" solo gasta espacio. */}
              <div className="mood-strip-block hidden" id="moodHistorySection">
                <div className="mood-strip-head">
                  <span className="mood-strip-label">You watched</span>
                  <button type="button" className="mood-strip-clear" id="moodHistoryClear">Clear</button>
                </div>
                <div className="mood-trending-strip" id="moodHistoryStrip"></div>
              </div>

              {/* ---------- CABECERA DEL TOKEN ----------
                  Identidad, precio y cambio en una fila. Antes eran dos
                  cajas de 140px. */}
              <div className="mood-token-header">
                <img id="moodTokenImg" src="/assets/logo/wojakmeter_logo.png" alt="" />

                <div className="mood-token-id">
                  <strong id="moodTokenName">Live Token</strong>
                  <span id="moodTokenSymbol">$---</span>
                </div>

                <div className="mood-token-price-block">
                  <strong id="moodTokenPrice">Reading</strong>
                  <span id="moodChange">--</span>
                </div>

                <div className="mood-token-links">
                  <a id="moodLinkDex" href="https://dexscreener.com" target="_blank"
                     rel="noopener noreferrer" className="mood-link-btn" title="DexScreener" aria-label="View on DexScreener">
                    <img src="/assets/brands/dexscreener.png" alt="" loading="lazy" />
                  </a>
                  <a id="moodLinkPump" href="https://pump.fun" target="_blank"
                     rel="noopener noreferrer" className="mood-link-btn hidden" title="Pump.fun" aria-label="View on Pump.fun">
                    <img src="/assets/brands/pumpfun.png" alt="" loading="lazy" />
                  </a>
                  <a id="moodLinkSolscan" href="https://solscan.io" target="_blank"
                     rel="noopener noreferrer" className="mood-link-btn" title="Solscan" aria-label="View on Solscan">
                    <img src="/assets/brands/solscan.png" alt="" loading="lazy" />
                  </a>
                </div>
              </div>

              {/* ---------- GRÁFICO CON MÉTRICAS ----------
                  El personaje deja el centro: un gráfico tapado por
                  una cara no se puede leer ni tocar. Ahora manda el
                  gráfico y el personaje reacciona desde una esquina,
                  enmarcado por un anillo con su score. */}
              <div className="mood-chart-shell">
                <div className="mood-chart-bar">
                  <div className="timeframes compact mood-token-timeframes" id="moodTokenTimeframes">
                    <button data-token-timeframe="1m">1m</button>
                    <button data-token-timeframe="5m" className="active">5m</button>
                    <button data-token-timeframe="15m">15m</button>
                    <button data-token-timeframe="1h">1h</button>
                    <button data-token-timeframe="4h">4h</button>
                    <button data-token-timeframe="24h">24h</button>
                  </div>

                  <div className="mood-chart-modes" id="moodChartModes">
                    <button type="button" className="chart-mode-btn active" data-mood-chart-mode="line">Line</button>
                    <button type="button" className="chart-mode-btn" data-mood-chart-mode="candle">Candles</button>
                  </div>
                </div>

                <div className="mood-stage" id="moodStage">
                  <div className="mood-stage-glow" id="moodStageGlow"></div>

                  <div className="mood-chart-backdrop hidden" id="moodChartBackdrop">
                    {/* Sin preserveAspectRatio="none": ese atributo
                        estiraba el lienzo y achataba las velas. El
                        viewBox lo fija el JS con el tamaño real. */}
                    <svg id="moodChartSvg" viewBox="0 0 900 320">
                      <defs>
                        <linearGradient id="moodGradUp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(59,217,122,0.30)" />
                          <stop offset="100%" stopColor="rgba(59,217,122,0)" />
                        </linearGradient>
                        <linearGradient id="moodGradDown" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(228,72,92,0.30)" />
                          <stop offset="100%" stopColor="rgba(228,72,92,0)" />
                        </linearGradient>
                      </defs>

                      <g className="mood-chart-grid" id="moodChartGrid"></g>
                      <g className="mood-chart-volume" id="moodChartVolume"></g>
                      <g className="mood-chart-body" id="moodChartBody"></g>
                      <g className="mood-chart-last" id="moodChartLast"></g>
                      <g className="mood-chart-axis mood-axis-y" id="moodChartAxis"></g>
                      <g className="mood-chart-axis mood-axis-x" id="moodChartAxisX"></g>
                      <g className="mood-chart-crosshair" id="moodChartCrosshair"></g>
                    </svg>

                    <div className="chart-tooltip hidden" id="moodChartTooltip"></div>
                  </div>

                  {/* ---------- RETRATO CON ANILLO DE SCORE ----------
                      El anillo hace de marco y de dato a la vez: el
                      score deja de necesitar una caja propia y pasa a
                      formar parte del retrato. */}
                  <div className="mood-hero-corner">
                    <div className="mood-hero-portrait" id="moodHeroPortrait">
                      <svg className="mood-score-ring" viewBox="0 0 100 100" aria-hidden="true">
                        <circle className="mood-ring-track" cx="50" cy="50" r="46"></circle>
                        <circle className="mood-ring-fill" id="moodScoreRing" cx="50" cy="50" r="46"></circle>
                      </svg>

                      <img
                        id="moodHeroImg"
                        className="mood-hero-img anim-float"
                        src="/assets/hero/classic/neutral.png"
                        alt="Token sentiment"
                      />

                      <div className="mood-ring-score">
                        <strong id="moodTokenScore">50</strong>
                      </div>
                    </div>

                    <strong id="moodHeroMood" className="mood-hero-label">Neutral</strong>
                  </div>

                  {/* La insignia SENTIMENT se elimina: repetía la
                      misma palabra que la etiqueta del anillo y, en
                      la esquina superior derecha, tapaba el valor
                      más alto del eje de precio. El mood se lee ya
                      bajo el retrato. */}
                </div>
              </div>

              {/* ---------- MÉTRICAS EN FILAS DENSAS ----------
                  Seis filas de 36px en vez de seis cajas de 140px. */}
              <div className="mood-metrics">
                <div className="mood-metric-row">
                  <span>Market Cap</span><strong id="moodTokenMarketCap">Reading</strong>
                </div>
                <div className="mood-metric-row">
                  <span>Volume</span><strong id="moodTokenVolume">Reading</strong>
                </div>
                <div className="mood-metric-row">
                  <span>Flow</span><strong id="moodTokenFlow">Reading</strong>
                </div>
                <div className="mood-metric-row">
                  <span>Volatility</span><strong id="moodTokenVolatility">Reading</strong>
                </div>
                <div className="mood-metric-row">
                  <span>Last action</span><strong id="moodTokenLastAction">Watching</strong>
                </div>
                <div className="mood-metric-row">
                  <span>Source</span><strong id="moodTokenSource">Auto</strong>
                </div>
              </div>

              {/* ---------- ACCIONES ---------- */}
              <div className="mood-actions-row">
                <button id="shareTokenMoodBtn" className="action-btn share-x-btn" type="button">
                  Share this mood
                </button>
                <button type="button" className="action-btn" id="copyMoodCaBtn">Copy CA</button>
              </div>

              {/* El contrato, discreto: se copia, no se lee. */}
              <div className="mood-ca-inline">
                <span id="moodCaLabel">Contract</span>
                <code id="moodContractAddress">--</code>
              </div>

              <div className="mood-trades-feed" id="moodTradesFeed">
                <div className="mood-empty-feed">Waiting for live trades…</div>
              </div>


            </section>

            {/* ===========================================================
                6. WOJAK STUDIO
            =========================================================== */}
            <section className="studio-card card" id="wojak-studio">
              <div className="section-head">
                <h3>Wojak Studio</h3>
                <span className="muted">Create content from live market sentiment</span>
              </div>

              <div className="tabs-row" id="studioTabs">
                <button className="tab-btn active" data-studio-tab="meme">Meme Generator</button>
                <button className="tab-btn" data-studio-tab="daily">Daily Market Meme</button>
                <button className="tab-btn" data-studio-tab="xpost">X Post Generator</button>
                <button className="tab-btn" data-studio-tab="story">Story Mode</button>
              </div>

              <div className="studio-panel active" id="studio-meme">
                <div className="studio-grid">
                  <div className="studio-box">
                    <div className="studio-box-head">
                      <h4>Meme Prompt</h4>
                      <button className="action-btn studio-copy-btn" data-copy-target="memePromptOutput">Copy</button>
                    </div>
                    <pre className="studio-output" id="memePromptOutput">Reading market…</pre>
                  </div>
                  <div className="studio-box">
                    <div className="studio-box-head">
                      <h4>Scene Summary</h4>
                      <button className="action-btn studio-copy-btn" data-copy-target="memeSceneOutput">Copy</button>
                    </div>
                    <div className="studio-output prose-output" id="memeSceneOutput">Reading market…</div>
                  </div>
                </div>
              </div>

              <div className="studio-panel" id="studio-daily">
                <div className="studio-grid studio-grid-single">
                  <div className="studio-box">
                    <div className="studio-box-head">
                      <h4>Daily Market Meme</h4>
                      <button className="action-btn studio-copy-btn" data-copy-target="dailyMemeOutput">Copy</button>
                    </div>
                    <div className="studio-output prose-output" id="dailyMemeOutput">Reading market…</div>
                  </div>
                </div>
              </div>

              <div className="studio-panel" id="studio-xpost">
                <div className="studio-grid">
                  <div className="studio-box">
                    <div className="studio-box-head">
                      <h4>X Caption</h4>
                      <button className="action-btn studio-copy-btn" data-copy-target="xPostCaptionOutput">Copy</button>
                    </div>
                    <div className="studio-output prose-output" id="xPostCaptionOutput">Reading market…</div>
                  </div>
                  <div className="studio-box">
                    <div className="studio-box-head">
                      <h4>Alt Text</h4>
                      <button className="action-btn studio-copy-btn" data-copy-target="xPostAltOutput">Copy</button>
                    </div>
                    <div className="studio-output prose-output" id="xPostAltOutput">Reading market…</div>
                  </div>
                  <div className="studio-box">
                    <div className="studio-box-head">
                      <h4>Hashtags</h4>
                      <button className="action-btn studio-copy-btn" data-copy-target="xPostTagsOutput">Copy</button>
                    </div>
                    <div className="studio-output prose-output" id="xPostTagsOutput">Reading market…</div>
                  </div>
                </div>
              </div>

              <div className="studio-panel" id="studio-story">
                <div className="studio-grid studio-grid-single">
                  <div className="studio-box">
                    <div className="studio-box-head">
                      <h4>Market Story</h4>
                      <button className="action-btn studio-copy-btn" data-copy-target="storyModeOutput">Copy</button>
                    </div>
                    <div className="studio-output prose-output" id="storyModeOutput">Reading market…</div>
                  </div>
                </div>
              </div>
            </section>

            {/* ===========================================================
                7. EMOTIONAL SCALE
            =========================================================== */}
            <section className="scale-card card" id="emotionScale">
              <h3>Emotional Scale</h3>
              <div className="scale-grid" id="scaleGrid"></div>
            </section>


            {/* ===========================================================
                8. EMOTION RUSH

                El juego va DESPUES de la escala emocional a proposito: para
                entonces el visitante ya ha visto las siete caras y el juego
                es una invitacion a probar si las ha entendido, no un examen
                sorpresa.

                Todo el estado vive en public/wojak-game.js. Este bloque solo
                declara los huecos.
                =========================================================== */}
            <section className="rush-section" id="emotionRush" data-market-mood="neutral">
              <div className="rush-shell">
                <div className="rush-head">
                  <div>
                    <span className="rush-eyebrow">
                      <span className="rush-badge">Play</span>
                      Emotion Rush
                    </span>
                    <h2 className="rush-title">Can you read the market faster than the market moves?</h2>
                    <p className="rush-lede">
                      A number appears. Tap the face that matches it. Every hit makes
                      the next one faster.
                    </p>
                  </div>
                  <div className="rush-head-side">
                    <span className="rush-market-tag" id="rushMarketTag">Market: Neutral 50</span>
                    <button type="button" className="rush-sound" id="rushSound" aria-pressed="true">
                      Sound on
                    </button>
                  </div>
                </div>

                {/* ── HUD ── */}
                <div className="rush-hud">
                  <div className="rush-hud-item">
                    <span>Score</span>
                    <strong id="rushScore">0</strong>
                  </div>
                  <div className="rush-hud-item">
                    <span>Round</span>
                    <strong id="rushRound">0</strong>
                  </div>
                  <div className="rush-hud-item">
                    <span>Streak</span>
                    <strong id="rushStreak">&mdash;</strong>
                  </div>
                  <div className="rush-hud-item">
                    <span>Your best</span>
                    <strong id="rushBest">&mdash;</strong>
                  </div>
                  <div className="rush-hud-item rush-hud-record">
                    <span>To beat</span>
                    <strong id="rushHudRecord">&mdash;</strong>
                  </div>
                  <div className="rush-hud-lives" id="rushLives" aria-label="Lives remaining"></div>
                </div>

                {/* ── TABLERO ── */}
                <div className="rush-stage" id="rushStage">
                  <div className="rush-timer" aria-hidden="true">
                    <div className="rush-timer-fill" id="rushTimerFill"></div>
                  </div>

                  <div className="rush-prompt">
                    <span className="rush-mode-label" id="rushModeLabel">Read the score</span>
                    <div className="rush-prompt-number" id="rushPromptNumber">50</div>
                    <div className="rush-prompt-face hidden" id="rushPromptFace"></div>
                    <span className="rush-hint" id="rushHint">Tap the face that matches the number</span>
                  </div>

                  <div className="rush-grid rush-grid-9" id="rushGrid"></div>

                  <div className="rush-feedback" id="rushFeedback"></div>

                  {/* Guia consultable durante la partida. El reloj no se
                      detiene: el coste de mirar es el tiempo. */}
                  <div className="rush-peek" id="rushPeekWrap">
                    <button
                      type="button"
                      className="rush-peek-toggle"
                      id="rushPeekToggle"
                      aria-expanded="false"
                    >
                      Scale
                    </button>
                    <div className="rush-scale-guide rush-scale-peek" id="rushScalePeek"></div>
                  </div>

                  {/* ── ANTES DE EMPEZAR ── */}
                  <div className="rush-overlay rush-overlay-start">
                    <div className="rush-overlay-inner">
                      <div className="rush-record-card">
                        <span className="rush-record-label">Record to beat</span>
                        <strong className="rush-record-value" id="rushRecordValue">&mdash;</strong>
                        <span className="rush-record-holder" id="rushRecordHolder">Loading&hellip;</span>
                      </div>

                      <div className="rush-scale-guide" id="rushScaleStart"></div>

                      <p className="rush-overlay-kicker">Three lives. No time limit but your own.</p>
                      <button type="button" className="rush-btn rush-btn-primary" id="rushStart">
                        Start
                      </button>
                      <span className="rush-overlay-note">Or press space &middot; keys 1&ndash;9 to answer</span>
                    </div>
                  </div>

                  {/* ── FINAL ── */}
                  <div className="rush-overlay rush-overlay-end">
                    <div className="rush-overlay-inner">
                      <span className="rush-overlay-kicker">Run over</span>
                      <div className="rush-final-score" id="rushFinalScore">0</div>
                      <p className="rush-final-context" id="rushFinalContext"></p>
                      <p className="rush-record-line" id="rushRecordLine"></p>

                      <div className="rush-final-stats">
                        <div><strong id="rushFinalRounds">0</strong><span>Rounds</span></div>
                        <div><strong id="rushFinalStreak">0</strong><span>Best streak</span></div>
                        <div><strong id="rushFinalReaction">&mdash;</strong><span>Avg reaction</span></div>
                        <div><strong id="rushRank">&mdash;</strong><span>Rank</span></div>
                      </div>

                      <div className="rush-final-actions">
                        <input
                          type="text"
                          id="rushName"
                          className="rush-name-input"
                          placeholder="Name for the board (optional)"
                          maxLength={18}
                          autoComplete="off"
                        />
                        <button type="button" className="rush-btn rush-btn-primary" id="rushRestart">
                          Play again
                        </button>
                        <button type="button" className="rush-btn" id="rushShare">
                          Share on X
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── TABLA ── */}
                <div className="rush-board-wrap">
                  <div className="rush-board-head">
                    <strong>This week</strong>
                    <span>Best run per player</span>
                  </div>
                  <ol className="rush-board" id="rushBoard">
                    <li className="rush-board-empty">Loading scores&hellip;</li>
                  </ol>
                </div>
              </div>
            </section>

            {/* ===========================================================
                9. ABOUT + FAQ
                Antes eran dos secciones seguidas diciendo lo mismo, y una
                de ellas se titulaba "SEO" en público. Fusionadas: mismo
                contenido sin duplicar, y las preguntas ahora llevan
                marcado FAQPage para rich results.
            =========================================================== */}
            <section className="about-section card" id="about">
              <div className="about-container">
                <span className="about-label">About</span>
                <h2 className="about-title">The Crypto Emotion Index.</h2>

                <p className="about-text">
                  A chart shows what happened. WojakMeter shows how the market reacted
                  to it. Price action, social sentiment and macro signals collapse into
                  one reading, so you know what the market feels like before you decide
                  anything.
                </p>

                <p className="about-text about-text-strong">
                  No noise. No complexity.<br />
                  Just the emotional state of the market.
                </p>

                <div className="about-divider"></div>

                <p className="about-text">
                  Wojak, the <strong>&quot;Feel Guy&quot;</strong>, represents raw human
                  emotion: fear, doubt, confidence, euphoria. Crypto markets move the
                  same way.
                </p>

                <p className="about-text about-text-strong">
                  Wojak isn&apos;t just a meme.<br />
                  He is the market.
                </p>

                <div className="about-divider" id="what-is-wojakmeter"></div>

                <h3 className="seo-subtitle">What is WojakMeter?</h3>
                <p className="about-text">
                  WojakMeter is a crypto sentiment tool that converts market data into a
                  real-time emotional index. It reads price momentum, social sentiment
                  and macro trends, then reports a single score for how the market feels.
                </p>

                <h3 className="seo-subtitle">How does the score work?</h3>
                <p className="about-text">
                  Multiple signals are aggregated into a 0–100 reading, mapped across
                  seven emotional states from Frustration to Euphoria. You can view the
                  raw market reading or blend in social, macro and community layers.
                </p>

                <h3 className="seo-subtitle">Why use it instead of a price chart?</h3>
                <p className="about-text">
                  A chart shows what happened. WojakMeter shows how the market reacted to
                  it. Two days with identical price action can carry completely different
                  emotional weight, and that difference is what the index measures.
                </p>
              </div>
            </section>

            {/* ===========================================================
                EMOTION PULSE — flotante
            =========================================================== */}
            <div className="emotion-pulse-toggle" id="pulseToggle" role="button" tabIndex={0}>
              <span className="pulse-toggle-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12h4l3-8 4 16 3-8h4" />
                </svg>
              </span>
              <span className="pulse-toggle-text">Emotion Pulse</span>
            </div>

            <div className="emotion-pulse-panel hidden" id="pulsePanel">
              <div className="pulse-header">
                <strong>Emotion Pulse</strong>
                <span className="pulse-subtitle">How the community feels right now</span>
              </div>

              <div id="pulseStats" className="pulse-stats"></div>

              <div className="pulse-grid">
                <button data-vote="frustration" type="button" aria-label="Vote frustration">
                  <img src="/assets/icons/classic/frustration.png" alt="" />
                </button>
                <button data-vote="concern" type="button" aria-label="Vote concern">
                  <img src="/assets/icons/classic/concern.png" alt="" />
                </button>
                <button data-vote="doubt" type="button" aria-label="Vote doubt">
                  <img src="/assets/icons/classic/doubt.png" alt="" />
                </button>
                <button data-vote="neutral" type="button" aria-label="Vote neutral">
                  <img src="/assets/icons/classic/neutral.png" alt="" />
                </button>
                <button data-vote="optimism" type="button" aria-label="Vote optimism">
                  <img src="/assets/icons/classic/optimism.png" alt="" />
                </button>
                <button data-vote="content" type="button" aria-label="Vote content">
                  <img src="/assets/icons/classic/content.png" alt="" />
                </button>
                <button data-vote="euphoria" type="button" aria-label="Vote euphoria">
                  <img src="/assets/icons/classic/euphoria.png" alt="" />
                </button>
              </div>

              <div className="pulse-summary">
                <div className="pulse-summary-box"><span>Pulse Mood</span><strong id="pulseMood">Neutral</strong></div>
                <div className="pulse-summary-box"><span>Total Votes</span><strong id="pulseTotalVotes">0</strong></div>
                <div className="pulse-summary-box"><span>Pulse Score</span><strong id="pulseScore">50</strong></div>
              </div>

              <div className="pulse-msg" id="pulseMsg"></div>
            </div>

          </main>

          {/* ===========================================================
              FOOTER
          =========================================================== */}
          <footer className="wm-footer">
            <div className="wm-footer-inner">
              <div className="wm-footer-brand">
                <img
                  src="/assets/logo/wojakmeter_logo.png"
                  alt="WojakMeter"
                  className="wm-footer-logo-img"
                />
                <span className="wm-footer-tagline">The Crypto Emotion Index</span>
              </div>

              <div className="wm-footer-links-wrap">
                <div className="wm-footer-col">
                  {/* Al footer le faltaban History, Emotional Scale y
                      el juego: se anadieron secciones a la pagina y
                      esta lista se quedo atras. Ahora sigue el mismo
                      orden en que aparecen al bajar. */}
                  <h4 className="wm-footer-title">Navigation</h4>
                  <a href="#market">Market Mood</a>
                  <a href="#historySection">Market Mood History</a>
                  <a href="#top-coins">Market Sections</a>
                  <a href="#bagMoodSection">Bag Mood</a>
                  <a href="#emotionRadarSection">Emotion Radar</a>
                  <a href="#moodSection">MOOD</a>
                  <a href="#wojak-studio">Wojak Studio</a>
                  <a href="#emotionScale">Emotional Scale</a>
                  <a href="#emotionRush">Emotion Rush</a>
                  <a href="#about">About</a>
                </div>

                <div className="wm-footer-col">
                  <h4 className="wm-footer-title">Legal</h4>
                  <Link href="/terms">Terms</Link>
                  <Link href="/privacy">Privacy</Link>
                  <Link href="/disclaimer">Disclaimer</Link>
                </div>

                <div className="wm-footer-col">
                  <h4 className="wm-footer-title">Community</h4>
                  <a
                    href="https://x.com/wojakmeterx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link"
                  >
                    <span className="x-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M18.244 2H21.5l-7.19 8.22L22 22h-6.84l-5.36-6.99L3.5 22H.244l7.68-8.77L2 2h6.93l4.85 6.41L18.244 2zm-1.2 18h1.9L7.02 4h-2l12.02 16z"
                        />
                      </svg>
                    </span>
                    @wojakmeterx
                  </a>
                  <a
                    href="https://t.me/WojakMeter"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link"
                  >
                    Telegram Channel
                  </a>
                  <a
                    href="https://t.me/WojakMeter_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link"
                  >
                    Telegram Bot
                  </a>
                  <a href="mailto:contact@wojakmeter.com" className="footer-link">
                    contact@wojakmeter.com
                  </a>
                </div>
              </div>
            </div>

            <div className="wm-footer-bottom">
              <p>© 2026 WojakMeter. All rights reserved.</p>
            </div>
          </footer>

        </div>
      </div>
    </>
  );
}

export async function getServerSideProps({ req }) {
  const protocol =
    req.headers["x-forwarded-proto"] ||
    (req.headers.host?.includes("localhost") ? "http" : "https");
  const host    = req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  try {
    const [globalRes, sentimentRes] = await Promise.all([
      fetch(`${baseUrl}/api/global`),
      fetch(`${baseUrl}/api/sentiment`)
    ]);

    const globalJson    = await globalRes.json().catch(() => null);
    const sentimentJson = await sentimentRes.json().catch(() => null);

    const rawGlobal = globalJson?.raw || {};
    const change = Number(
      globalJson?.change ?? rawGlobal?.market_cap_change_percentage_24h_usd ?? 0
    );
    const volumeUsd     = Number(rawGlobal?.total_volume?.usd ?? 0);
    const score         = Number(sentimentJson?.score ?? clamp(50 + change * 10, 0, 100));
    const mood          = scoreToMood(score);
    const volumeCompact = formatCompactVolume(volumeUsd);
    const driver        = sentimentJson?.driver || "Market flow / price action";
    const risk          = sentimentJson?.risk   || "Balanced";

    const ogImageUrl =
      `${baseUrl}/api/og` +
      `?mood=${encodeURIComponent(mood)}` +
      `&score=${encodeURIComponent(score)}` +
      `&tf=24h` +
      `&change=${encodeURIComponent(change.toFixed(2))}` +
      `&volume=${encodeURIComponent(volumeCompact)}` +
      `&coin=${encodeURIComponent("MARKET")}` +
      `&driver=${encodeURIComponent(driver)}` +
      `&risk=${encodeURIComponent(risk)}` +
      `&style=${encodeURIComponent("classic")}`;

    return { props: { ogImageUrl } };
  } catch {
    return {
      props: {
        ogImageUrl: `${baseUrl}/api/og?mood=neutral&score=50&tf=24h&change=0&volume=%24--&coin=MARKET&driver=Market%20flow%20%2F%20price%20action&risk=Balanced&style=classic`
      }
    };
  }
}
