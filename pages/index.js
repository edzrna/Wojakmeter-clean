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
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;

  return `$${value.toFixed(0)}`;
}

export default function Home({ ogImageUrl }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "WojakMeter",
    url: "https://wojakmeter.com",
    description:
      "WojakMeter is a real-time crypto emotion index that translates market data into sentiment.",
    publisher: {
      "@type": "Organization",
      name: "WojakMeter",
      url: "https://wojakmeter.com",
      logo: {
        "@type": "ImageObject",
        url: "https://wojakmeter.com/assets/logo/wojakmeter_logo.png"
      }
    },
    sameAs: ["https://x.com/wojakmeterx"]
  };

  return (
    <>
      <Head>
        <title>WojakMeter – Crypto Emotion Index | Market Sentiment Tracker</title>

        <meta
          name="description"
          content="Track real-time crypto market emotion with WojakMeter. A sentiment index powered by price action, social signals and macro trends."
        />

        <meta
          name="keywords"
          content="wojakmeter, crypto sentiment, crypto emotion index, bitcoin sentiment, crypto market mood, market sentiment tracker, fear and greed alternative, crypto psychology, mood token, dexscreener sentiment, solana token mood"
        />

        <meta name="robots" content="index, follow" />
        <meta name="author" content="WojakMeter" />
        <meta name="theme-color" content="#071018" />

        <link rel="canonical" href="https://wojakmeter.com" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=2" />
        <link rel="shortcut icon" href="/favicon.png?v=2" />

        <meta property="og:title" content="WojakMeter – The Crypto Emotion Index" />
        <meta
          property="og:description"
          content="Understand what the crypto market feels like in real-time using WojakMeter."
        />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:url" content="https://wojakmeter.com" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="WojakMeter" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="WojakMeter – Crypto Emotion Index" />
        <meta
          name="twitter:description"
          content="Real-time crypto market emotion powered by price action and sentiment."
        />
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

      <Script src="/script.js?v=11" strategy="afterInteractive" />

      <div className="style-classic">
        <div className="app-shell">
          <header className="topbar cardless" id="market">
            <div className="topbar-left">
              <img
                src="/assets/logo/wojakmeter_logo.png"
                alt="WojakMeter Logo"
                className="logo-img"
              />
            </div>

            <div className="topbar-right-group">
              <div className="topbar-center">
                <div className="market-stat">
                  BTC.D <strong id="btcDominance">--</strong>
                </div>
                <div className="market-stat">
                  Market Cap <strong id="headerMarketCap">--</strong>
                </div>
                <div className="market-stat">
                  24H Volume <strong id="headerVolume">--</strong>
                </div>
              </div>

              <div className="topbar-right">
                <a
                  href="#moodSection"
                  className="topbar-mood-link mood-logo-link"
                  aria-label="Go to MOOD section"
                >
                  <img
                    src="/moodlogo.png"
                    alt="MOOD Logo"
                    className="mood-nav-logo"
                  />
                </a>

                <label className="style-label" htmlFor="styleSelector">
                  Wojak Style
                </label>
                <select id="styleSelector" defaultValue="classic">
                  <option value="classic">Classic</option>
                  <option value="synth">Synth</option>
                  <option value="boyak">Boyak</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
            </div>
          </header>

          <div className="ticker-bar" id="tickerBar">
            <span>Loading market...</span>
          </div>

          <main className="dashboard">
            <section className="hero card">
              <h2 id="heroTitle">
                CRYPTO MARKET MOOD
                <span id="heroDriverLabel"> (Market flow / price action)</span>
              </h2>

              <div className="hero-grid hero-grid-single">
                <div className="hero-main">
                  <div className="wojak-stage">
                    <div className="sweat hidden" id="sweatFx">
                      💧
                    </div>

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
                            alt="Social mood icon"
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
                            <span id="socialExpandEngagement">--</span>
                          </div>

                          <div className="social-expand-row">
                            <strong>Bullish</strong>
                            <span id="socialExpandBullish">--</span>
                          </div>

                          <div className="social-expand-row">
                            <strong>Bearish</strong>
                            <span id="socialExpandBearish">--</span>
                          </div>

                          <div className="social-expand-row">
                            <strong>Neutral</strong>
                            <span id="socialExpandNeutral">--</span>
                          </div>

                          <div className="social-expand-row">
                            <strong>Window</strong>
                            <span id="socialExpandWindow">24h</span>
                          </div>

                          <div className="social-expand-note">
                            Social mood is derived from aggregated market sentiment across X,
                            trending coins and meme activity.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="hero-timeline-backdrop hidden" id="heroTimelineBackdrop">
                      <svg viewBox="0 0 900 280" preserveAspectRatio="none" aria-hidden="true">
                        <path id="heroTimelineArea" d=""></path>
                        <path id="heroTimelineLine" d=""></path>
                      </svg>
                    </div>

                    <img
                      id="heroFaceImg"
                      className="hero-face-img anim-float"
                      src="/assets/hero/classic/neutral.png"
                      alt="Global market mood"
                    />
                  </div>

                  <div className="hero-mood mood-neutral" id="heroMood">
                    Neutral
                  </div>

                  <div className="hero-score" id="heroScoreWrap">
                    Score: <span id="heroScore">50</span> / 100
                  </div>

                  <section
                    className="emotion-bar-inline emotion-bar-inline-minimal"
                    id="emotionBarSection"
                  >
                    <div className="emotion-track-wrap">
                      <div className="emotion-track emotion-track-gradient" id="emotionTrack">
                        <div
                          className="emotion-pointer"
                          id="emotionPointer"
                          aria-label="WojakMeter indicator"
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

                  <div className="heartbeat-wrap" id="heartbeatWrap">
                    <div className="heartbeat-heart" id="heartbeatHeart">
                      ❤
                    </div>
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

                  <div className="timeframes hero-timeframes" id="heroTimeframes">
                    <button data-timeframe="1h">1h</button>
                    <button data-timeframe="4h">4h</button>
                    <button data-timeframe="24h" className="active">
                      24h
                    </button>
                    <button data-timeframe="7d">7d</button>
                    <button data-timeframe="30d">30d</button>
                  </div>

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
                        <path
                          className="gauge-track"
                          d="M30 150 A120 120 0 0 1 270 150"
                        ></path>
                        <path
                          id="gaugeFill"
                          d="M30 150 A120 120 0 0 1 270 150"
                        ></path>
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

                  <section className="wm-layers disabled-layers" id="wmLayers">
                    <div className="layer-title">
                      Toggle layers to see how each force affects the hero
                    </div>

                    <div className="layer-buttons" id="layerButtons">
                      <button
                        type="button"
                        className="layer-btn active"
                        data-layer="market"
                        id="toggleLayerMarket"
                      >
                        Market Mood
                      </button>
                      <button
                        type="button"
                        className="layer-btn"
                        data-layer="social"
                        id="toggleLayerSocial"
                      >
                        Social Mood
                      </button>
                      <button
                        type="button"
                        className="layer-btn"
                        data-layer="driver"
                        id="toggleLayerDriver"
                      >
                        Market Driver
                      </button>
                      <button
                        type="button"
                        className="layer-btn"
                        data-layer="pulse"
                        id="toggleLayerPulse"
                      >
                        Emotion Pulse
                      </button>
                    </div>

                    <div className="layer-grid">
                      <div className="layer-card">
                        <span className="layer-card-label">Market</span>
                        <strong className="layer-card-score" id="layerScoreMarket">
                          50
                        </strong>
                        <div className="layer-mini-bar">
                          <span id="layerBarMarket"></span>
                        </div>
                        <div className="layer-impact" id="layerImpactMarket">
                          Base
                        </div>
                      </div>

                      <div className="layer-card">
                        <span className="layer-card-label">Social</span>
                        <strong className="layer-card-score" id="layerScoreSocial">
                          50
                        </strong>
                        <div className="layer-mini-bar">
                          <span id="layerBarSocial"></span>
                        </div>
                        <div className="layer-impact" id="layerImpactSocial">
                          +0
                        </div>
                      </div>

                      <div className="layer-card">
                        <span className="layer-card-label">Driver</span>
                        <strong className="layer-card-score" id="layerScoreDriver">
                          50
                        </strong>
                        <div className="layer-mini-bar">
                          <span id="layerBarDriver"></span>
                        </div>
                        <div className="layer-impact" id="layerImpactDriver">
                          +0
                        </div>
                      </div>

                      <div className="layer-card">
                        <span className="layer-card-label">Pulse</span>
                        <strong className="layer-card-score" id="layerScorePulse">
                          50
                        </strong>
                        <div className="layer-mini-bar">
                          <span id="layerBarPulse"></span>
                        </div>
                        <div className="layer-impact" id="layerImpactPulse">
                          +0
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="hero-market-line">
                    <div className="hero-line-item">
                      <span>Market Change</span>
                      <strong id="globalMarketChange">--</strong>
                    </div>
                    <div className="hero-line-sep"></div>
                    <div className="hero-line-item">
                      <span>Volume</span>
                      <strong id="globalMarketVolume" className="header-accent">
                        --
                      </strong>
                    </div>
                    <div className="hero-line-sep"></div>
                    <div className="hero-line-item">
                      <span>Timeframe</span>
                      <strong id="globalMarketTimeframe">24h</strong>
                    </div>
                  </div>
                </div>

                <section className="drivers-card card">
                  <div className="section-head">
                    <h3>MARKET DRIVERS</h3>
                  </div>

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
                      <strong id="driverNarrative">Waiting for live market data.</strong>
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

            <section className="mood-token-card card" id="moodSection">
              <div className="section-head">
                <div className="mood-section-logo-wrap">
                  <img
                    src="/moodlogo.png"
                    alt="MOOD Logo"
                    className="mood-section-logo"
                  />
                </div>
                <span className="muted">Reactive token mood engine</span>
              </div>

              <div className="mood-token-grid">
                <div className="mood-token-main">
                  <div className="mood-token-copy">
                    <span className="about-label">MOOD LIVE</span>
                    <h2 className="about-title">Watch any Solana token react in real time.</h2>
                    <p className="about-text">
                      Track a default live token, switch to MOOD anytime, or paste any Solana token
                      address to watch live emotional flow with DexScreener first and Pump.fun
                      fallback.
                    </p>
                  </div>

                  <div className="mood-ca-box">
                    <div className="mood-ca-head">
                      <span>MOOD Contract Address</span>
                    </div>

                    <div className="mood-ca-row">
                      <code id="moodContractAddress">PEGAR_ADDRESS_OFICIAL_AQUI</code>
                      <button type="button" className="action-btn" id="copyMoodCaBtn">
                        Copy CA
                      </button>
                    </div>
                  </div>

                  <div className="mood-search-box">
                    <input
                      id="tokenSearchInput"
                      type="text"
                      placeholder="Paste Solana token address..."
                      className="mood-input"
                    />
                    <button id="tokenSearchBtn" className="action-btn" type="button">
                      Load Token
                    </button>
                  </div>

                  <div className="mood-actions-row">
                    <button id="loadMoodMain" className="action-btn mood-buy-btn" type="button">
                      Load MOOD
                    </button>

                    <a
                      href="https://dexscreener.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="action-btn mood-secondary-btn"
                    >
                      DexScreener
                    </a>
                  </div>

                  <div className="mood-token-meta">
                    <img
                      id="moodTokenImg"
                      src="/assets/logo/wojakmeter_logo.png"
                      alt="Token icon"
                    />
                    <div className="mood-token-meta-copy">
                      <strong id="moodTokenName">Live Token</strong>
                      <span id="moodTokenSymbol">$---</span>
                    </div>
                  </div>

                  <div className="timeframes mood-token-timeframes" id="moodTokenTimeframes">
                    <button data-token-timeframe="1m">1m</button>
                    <button data-token-timeframe="5m" className="active">
                      5m
                    </button>
                    <button data-token-timeframe="15m">15m</button>
                    <button data-token-timeframe="1h">1h</button>
                    <button data-token-timeframe="4h">4h</button>
                    <button data-token-timeframe="24h">24h</button>
                  </div>

                  <div className="mood-stats-grid">
                    <div className="mood-stat-box">
                      <span>Price</span>
                      <strong id="moodTokenPrice">--</strong>
                    </div>

                    <div className="mood-stat-box">
                      <span>Market Cap</span>
                      <strong id="moodTokenMarketCap">--</strong>
                    </div>

                    <div className="mood-stat-box">
                      <span>Volume</span>
                      <strong id="moodTokenVolume">--</strong>
                    </div>

                    <div className="mood-stat-box">
                      <span>Change</span>
                      <strong id="moodChange">--</strong>
                    </div>

                    <div className="mood-stat-box">
                      <span>Flow</span>
                      <strong id="moodTokenFlow">--</strong>
                    </div>

                    <div className="mood-stat-box">
                      <span>Volatility</span>
                      <strong id="moodTokenVolatility">--</strong>
                    </div>

                    <div className="mood-stat-box">
                      <span>Last Action</span>
                      <strong id="moodTokenLastAction">Watching...</strong>
                    </div>
                  </div>
                </div>

                <div className="mood-token-visual">
                  <div className="mood-stage" id="moodStage">
                    <div className="mood-stage-glow" id="moodStageGlow"></div>

                    <div className="mood-chart-backdrop hidden" id="moodChartBackdrop">
                      <svg viewBox="0 0 900 280" preserveAspectRatio="none" aria-hidden="true">
                        <path id="moodChartArea" d=""></path>
                        <path id="moodChartLine" d=""></path>
                      </svg>
                    </div>

                    <img
                      id="moodHeroImg"
                      className="mood-hero-img anim-float"
                      src="/assets/hero/classic/neutral.png"
                      alt="Mood token sentiment"
                    />

                    <div className="mood-token-badge" id="moodTokenBadge">
                      <span>Token Sentiment</span>
                      <strong>Neutral</strong>
                    </div>
                  </div>

                  <div className="mood-token-score-row">
                    <div className="mood-token-score-box">
                      <span>Score</span>
                      <strong id="moodTokenScore">50</strong>
                    </div>
                    <div className="mood-token-score-box">
                      <span>Status</span>
                      <strong id="moodHeroMood">Neutral</strong>
                    </div>
                    <div className="mood-token-score-box">
                      <span>Source</span>
                      <strong id="moodTokenSource">Auto</strong>
                    </div>
                  </div>

                  <div className="mood-trades-feed" id="moodTradesFeed">
                    <div className="mood-empty-feed">Waiting live trades...</div>
                  </div>

                  <div className="mood-token-note">
                    This module reacts to live token momentum, trade pressure, timeframe change and
                    fallback market data using DexScreener first and Pump.fun when needed.
                  </div>
                </div>
              </div>
            </section>
{/* ===============================
   BAG MOOD MODULE
================================ */}
<section className="bag-mood-section card" id="bagMoodSection">
  <div className="section-head">
    <div>
      <h3>BAG MOOD</h3>
      <span className="muted">
        Track your portfolio value, P&L and emotional state.
      </span>
    </div>

    <div className="bag-style-control">
      <label htmlFor="bagStyleSelector">Bag Style</label>
      <select id="bagStyleSelector" defaultValue="classic">
        <option value="classic">Classic</option>
        <option value="synth">Synth</option>
        <option value="boyak">Boyak</option>
        <option value="minimal">Minimal</option>
      </select>
    </div>
  </div>

  <div className="bag-mood-grid">

    {/* LEFT HERO */}
    <div className="bag-mood-visual">

      <div className="bag-mood-stage">
        <img
          id="bagMoodHeroImg"
          className="bag-mood-hero-img anim-float"
          src="/assets/hero/classic/neutral.png"
          alt="Bag Mood Hero"
        />

        {/* Selected coin floating badge */}
        <div
          id="bagSelectedCoinBadge"
          className="bag-selected-coin-badge hidden"
        >
          <img
            id="bagSelectedCoinImg"
            src="/assets/logo/wojakmeter_logo.png"
            alt="Selected Coin"
          />
        </div>
      </div>

      {/* ONLY ONE mood icon */}
      <div className="bag-mood-result">

        <div className="bag-single-mood-icon-wrap">
          <img
            id="bagMoodIconImg"
            className="bag-title-mood-icon"
            src="/assets/icons/classic/neutral.png"
            alt="Mood Icon"
          />
        </div>

        <div className="bag-mood-score-row">
          <div>
            <span>Portfolio Value</span>
            <strong id="bagPortfolioValue">$0.00</strong>
          </div>

          <div>
            <span>Total Invested</span>
            <strong id="bagTotalInvested">$0.00</strong>
          </div>

          <div>
            <span>PNL %</span>
            <strong
              id="bagPortfolioPnlPercent"
              className="neutral"
            >
              +0.00%
            </strong>
          </div>

          <div>
            <span>PNL</span>
            <strong
              id="bagPortfolioPnl"
              className="neutral"
            >
              $0.00
            </strong>
          </div>
        </div>
      </div>
    </div>

    {/* RIGHT SIDE */}
    <div className="bag-mood-main">

      <div className="bag-mode-tabs">
        <button
          type="button"
          className="active"
          data-bag-mode="portfolio"
        >
          Portfolio Mood
        </button>

        <button
          type="button"
          data-bag-mode="single"
        >
          Single Coin Mood
        </button>
      </div>

      <div className="bag-position-note">
        Your mood is calculated from your real entry price vs live market price.
      </div>

      {/* Search Inputs */}
      <div className="bag-search-box">
        <input
          id="bagSearchInput"
          type="text"
          placeholder="Search BTC, SOL, MOOD or paste contract..."
          autoComplete="off"
        />

        <input
          id="bagValueInput"
          type="number"
          min="0"
          step="any"
          placeholder="USD invested"
        />

        <input
          id="bagEntryPriceInput"
          type="number"
          min="0"
          step="any"
          placeholder="Entry price"
        />

        <button
          id="bagSearchBtn"
          type="button"
          className="action-btn"
        >
          Add
        </button>
      </div>

      <div
        id="bagSearchResults"
        className="bag-search-results"
      ></div>

      {/* Holdings list */}
      <div
        id="bagMoodList"
        className="bag-mood-list"
      >
        <div className="bag-empty">
          Build your bag to see what it feels like.
        </div>
      </div>

      {/* Actions */}
      <div className="bag-actions">
        <button
          id="bagShareBtn"
          type="button"
          className="action-btn share-x-btn"
        >
          Share Bag Mood
        </button>

        <button
          id="bagResetBtn"
          type="button"
          className="action-btn"
        >
          Reset Bag
        </button>
      </div>
    </div>
  </div>
</section>
			
			                             
            <section className="top-coins card" id="top-coins">
              <div className="section-head">
                <h3>MARKET SECTIONS</h3>
                <span className="muted">Live market overview</span>
              </div>

              <div className="tabs-row" id="marketTabs">
                <button className="tab-btn active" data-tab="coins">
                  Top 10 Coins
                </button>
                <button className="tab-btn" data-tab="trending">
                  Trending Coins 🔥
                </button>
                <button className="tab-btn" data-tab="memes">
                  Top Meme Coins
                </button>
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
            </section>

            <section className="detail-grid detail-grid-single">
              <section className="chart-card card">
                <div className="chart-topbar">
                  <div className="chart-coin-meta">
                    <div className="chart-coin-icon-wrap">
                      <img id="chartCoinIcon" className="chart-coin-icon" src="" alt="Coin icon" />
                    </div>

                    <div className="chart-coin-copy">
                      <div className="chart-coin-title-line">
                        <h3 id="chartTitle">BTC / Bitcoin</h3>
                        <span className="muted" id="chartRenderMode">
                          Line chart
                        </span>
                      </div>

                      <div className="chart-coin-stats">
                        <div className="chart-mini-stat">
                          <span>Price</span>
                          <strong id="chartCoinPrice">--</strong>
                        </div>
                        <div className="chart-mini-stat">
                          <span>Volume</span>
                          <strong id="chartCoinVolume">--</strong>
                        </div>
                        <div className="chart-mini-stat">
                          <span>Market Cap</span>
                          <strong id="chartCoinMarketCap">--</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="chart-toolbar">
                    <div className="timeframes compact" id="chartTimeframes">
                      <button data-timeframe="1h">1h</button>
                      <button data-timeframe="4h">4h</button>
                      <button data-timeframe="24h" className="active">
                        24h
                      </button>
                      <button data-timeframe="7d">7d</button>
                      <button data-timeframe="30d">30d</button>
                    </div>

                    <div className="chart-mode-switch" id="chartModeSwitch">
                      <button className="chart-mode-btn active" data-mode="line">
                        Line
                      </button>
                      <button className="chart-mode-btn" data-mode="candle">
                        Candles
                      </button>
                    </div>
                  </div>
                </div>

                <div className="chart-inline-moods">
                  <div className="chart-mood-chip">
                    <img
                      id="coinMoodIconImg"
                      className="chart-mood-chip-icon mood-icon-img anim-float"
                      src="/assets/icons/classic/neutral.png"
                      alt="Technical mood icon"
                    />
                    <div>
                      <span>Technical</span>
                      <strong id="coinMoodLabel">Neutral</strong>
                    </div>
                  </div>

                  <div className="chart-mood-chip">
                    <img
                      id="detailSocialIconImg"
                      className="chart-mood-chip-icon mood-icon-img anim-float"
                      src="/assets/icons/classic/neutral.png"
                      alt="Social mood icon"
                    />
                    <div>
                      <span>Social</span>
                      <strong id="detailSocialLabel">Neutral</strong>
                    </div>
                  </div>

                  <div className="chart-mood-chip chart-mood-chip-performance">
                    <div>
                      <span>Performance</span>
                      <strong id="selectedPerformance">--</strong>
                    </div>
                  </div>
                </div>

                <div className="chart-placeholder">
                  <div className="chart-time-label" id="chartTimeLabel">
                    Viewing 24h structure
                  </div>

                  <svg
                    id="coinChartSvg"
                    viewBox="0 0 900 280"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path id="coinChartArea" d=""></path>
                    <path id="coinChartPath" d=""></path>
                    <g id="coinChartCandles"></g>
                  </svg>
                </div>

                <div className="chart-footer">
                  <div className="muted">
                    <span id="selectedTimeframe">24h</span>
                  </div>
                </div>

                <div className="market-intervals">
                  <div className="interval-box">
                    <span>1h</span>
                    <strong id="perf1h">--</strong>
                  </div>
                  <div className="interval-box">
                    <span>4h</span>
                    <strong id="perf4h">--</strong>
                  </div>
                  <div className="interval-box">
                    <span>24h</span>
                    <strong id="perf24h">--</strong>
                  </div>
                  <div className="interval-box">
                    <span>7d</span>
                    <strong id="perf7d">--</strong>
                  </div>
                  <div className="interval-box">
                    <span>30d</span>
                    <strong id="perf30d">--</strong>
                  </div>
                </div>
              </section>
            </section>

            <section className="studio-card card" id="wojak-studio">
              <div className="section-head">
                <h3>WOJAK STUDIO</h3>
                <span className="muted">Create content from live market sentiment</span>
              </div>

              <div className="tabs-row" id="studioTabs">
                <button className="tab-btn active" data-studio-tab="meme">
                  Meme Generator
                </button>
                <button className="tab-btn" data-studio-tab="daily">
                  Daily Market Meme
                </button>
                <button className="tab-btn" data-studio-tab="xpost">
                  X Post Generator
                </button>
                <button className="tab-btn" data-studio-tab="story">
                  Story Mode
                </button>
              </div>

              <div className="studio-panel active" id="studio-meme">
                <div className="studio-grid">
                  <div className="studio-box">
                    <div className="studio-box-head">
                      <h4>Meme Prompt</h4>
                      <button
                        className="action-btn studio-copy-btn"
                        data-copy-target="memePromptOutput"
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="studio-output" id="memePromptOutput">
                      Loading...
                    </pre>
                  </div>

                  <div className="studio-box">
                    <div className="studio-box-head">
                      <h4>Scene Summary</h4>
                      <button
                        className="action-btn studio-copy-btn"
                        data-copy-target="memeSceneOutput"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="studio-output prose-output" id="memeSceneOutput">
                      Loading...
                    </div>
                  </div>
                </div>
              </div>

              <div className="studio-panel" id="studio-daily">
                <div className="studio-grid studio-grid-single">
                  <div className="studio-box">
                    <div className="studio-box-head">
                      <h4>Daily Market Meme</h4>
                      <button
                        className="action-btn studio-copy-btn"
                        data-copy-target="dailyMemeOutput"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="studio-output prose-output" id="dailyMemeOutput">
                      Loading...
                    </div>
                  </div>
                </div>
              </div>

              <div className="studio-panel" id="studio-xpost">
                <div className="studio-grid">
                  <div className="studio-box">
                    <div className="studio-box-head">
                      <h4>X Caption</h4>
                      <button
                        className="action-btn studio-copy-btn"
                        data-copy-target="xPostCaptionOutput"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="studio-output prose-output" id="xPostCaptionOutput">
                      Loading...
                    </div>
                  </div>

                  <div className="studio-box">
                    <div className="studio-box-head">
                      <h4>Alt Text</h4>
                      <button
                        className="action-btn studio-copy-btn"
                        data-copy-target="xPostAltOutput"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="studio-output prose-output" id="xPostAltOutput">
                      Loading...
                    </div>
                  </div>

                  <div className="studio-box">
                    <div className="studio-box-head">
                      <h4>Hashtags</h4>
                      <button
                        className="action-btn studio-copy-btn"
                        data-copy-target="xPostTagsOutput"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="studio-output prose-output" id="xPostTagsOutput">
                      Loading...
                    </div>
                  </div>
                </div>
              </div>

              <div className="studio-panel" id="studio-story">
                <div className="studio-grid studio-grid-single">
                  <div className="studio-box">
                    <div className="studio-box-head">
                      <h4>Market Story</h4>
                      <button
                        className="action-btn studio-copy-btn"
                        data-copy-target="storyModeOutput"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="studio-output prose-output" id="storyModeOutput">
                      Loading...
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="scale-card card">
              <h3>EMOTIONAL SCALE</h3>
              <div className="scale-grid" id="scaleGrid"></div>
            </section>

            <section className="about-section card" id="about">
              <div className="about-container">
                <span className="about-label">🧠 About</span>

                <h2 className="about-title">WojakMeter is the Crypto Emotion Index.</h2>

                <p className="about-text">
                  We transform price action, sentiment, and macro signals into a single emotional
                  score so you instantly understand what the market feels like.
                </p>

                <p className="about-text about-text-strong">
                  No noise. No complexity.
                  <br />
                  Just the emotional state of the market.
                </p>

                <div className="about-divider"></div>

                <p className="about-text">
                  Wojak, also known as the <strong>“Feel Guy”</strong>, represents raw human
                  emotion: fear, doubt, confidence, euphoria.
                </p>

                <p className="about-text">Crypto markets move the same way.</p>

                <p className="about-text about-text-strong">
                  Wojak isn’t just a meme.
                  <br />
                  He is the market.
                </p>
              </div>
            </section>

            <section className="seo-section card" id="what-is-wojakmeter">
              <div className="about-container">
                <span className="about-label">🔍 SEO</span>
                <h2 className="about-title">What is WojakMeter?</h2>

                <p className="about-text">
                  WojakMeter is a crypto sentiment tool that converts market data into a real-time
                  emotional index. By analyzing price momentum, social sentiment, and macro trends,
                  it provides a clear view of how the crypto market feels.
                </p>

                <h3 className="seo-subtitle">How does it work?</h3>
                <p className="about-text">
                  The platform aggregates multiple signals and translates them into a 0–100 score,
                  mapped across 7 emotional states ranging from Frustration to Euphoria.
                </p>

                <h3 className="seo-subtitle">Why use WojakMeter?</h3>
                <p className="about-text">
                  Traditional tools focus on raw data. WojakMeter focuses on interpretation,
                  helping traders quickly understand market psychology through a visual emotional
                  framework.
                </p>
              </div>
            </section>

            <div className="emotion-pulse-toggle" id="pulseToggle" role="button" tabIndex={0}>
              <span className="pulse-toggle-icon">⚡</span>
              <span className="pulse-toggle-text">Emotion Pulse</span>
            </div>

            <div className="emotion-pulse-panel hidden" id="pulsePanel">
              <div className="pulse-header">
                <strong>Emotion Pulse</strong>
                <span className="pulse-subtitle">Community reaction</span>
              </div>

              <div id="pulseStats" className="pulse-stats"></div>

              <div className="pulse-grid">
                <button data-vote="frustration" type="button">
                  <img src="/assets/icons/classic/frustration.png" alt="frustration" />
                </button>
                <button data-vote="concern" type="button">
                  <img src="/assets/icons/classic/concern.png" alt="concern" />
                </button>
                <button data-vote="doubt" type="button">
                  <img src="/assets/icons/classic/doubt.png" alt="doubt" />
                </button>
                <button data-vote="neutral" type="button">
                  <img src="/assets/icons/classic/neutral.png" alt="neutral" />
                </button>
                <button data-vote="optimism" type="button">
                  <img src="/assets/icons/classic/optimism.png" alt="optimism" />
                </button>
                <button data-vote="content" type="button">
                  <img src="/assets/icons/classic/content.png" alt="content" />
                </button>
                <button data-vote="euphoria" type="button">
                  <img src="/assets/icons/classic/euphoria.png" alt="euphoria" />
                </button>
              </div>

              <div className="pulse-summary">
                <div className="pulse-summary-box">
                  <span>Pulse Mood</span>
                  <strong id="pulseMood">Neutral</strong>
                </div>
                <div className="pulse-summary-box">
                  <span>Total Votes</span>
                  <strong id="pulseTotalVotes">0</strong>
                </div>
                <div className="pulse-summary-box">
                  <span>Pulse Score</span>
                  <strong id="pulseScore">50</strong>
                </div>
              </div>

              <div className="pulse-msg" id="pulseMsg"></div>
            </div>
          </main>

          <footer className="wm-footer">
            <div className="wm-footer-inner">
              <div className="wm-footer-brand">
                <img
                  src="/assets/logo/wojakmeter_logo.png"
                  alt="WojakMeter Logo"
                  className="wm-footer-logo-img"
                />
              </div>

              <div className="wm-footer-links-wrap">
                <div className="wm-footer-col">
                  <h4 className="wm-footer-title">Navigation</h4>
                  <a href="#about">About</a>
                  <a href="#market">Market Mood</a>
                  <a href="#moodSection">MOOD</a>
                  <a href="#top-coins">Top Coins</a>
                  <a href="#wojak-studio">Wojak Studio</a>
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

                  <a href="mailto:contact@wojakmeter.com" className="footer-link">
                    contact@wojakmeter.com
                  </a>

                  <a
                    href="https://t.me/WojakMeter"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link"
                  >
                    Telegram
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

  const host = req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  try {
    const [globalRes, sentimentRes] = await Promise.all([
      fetch(`${baseUrl}/api/global`),
      fetch(`${baseUrl}/api/sentiment`)
    ]);

    const globalJson = await globalRes.json().catch(() => null);
    const sentimentJson = await sentimentRes.json().catch(() => null);

    const rawGlobal = globalJson?.raw || {};
    const change = Number(
      globalJson?.change ?? rawGlobal?.market_cap_change_percentage_24h_usd ?? 0
    );
    const volumeUsd = Number(rawGlobal?.total_volume?.usd ?? 0);

    const score = Number(sentimentJson?.score ?? clamp(50 + change * 10, 0, 100));
    const mood = scoreToMood(score);

    const volumeCompact = formatCompactVolume(volumeUsd);

    const driver = sentimentJson?.driver || "Market flow / price action";
    const risk = sentimentJson?.risk || "Balanced";

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

    return {
      props: {
        ogImageUrl
      }
    };
  } catch {
    return {
      props: {
        ogImageUrl:
          `${baseUrl}/api/og?mood=neutral&score=50&tf=24h&change=0&volume=%24--&coin=MARKET&driver=Market%20flow%20%2F%20price%20action&risk=Balanced&style=classic`
      }
    };
  }
}
