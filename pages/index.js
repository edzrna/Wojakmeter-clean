import Head from "next/head";
import Script from "next/script";
import Link from "next/link";

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
    sameAs: ["https://x.com/WojakMeter"]
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
          content="wojakmeter, crypto sentiment, crypto emotion index, bitcoin sentiment, crypto market mood, market sentiment tracker, fear and greed alternative, crypto psychology"
        />

        <meta name="robots" content="index, follow" />
        <meta name="author" content="WojakMeter" />
        <meta name="theme-color" content="#071018" />

        <link rel="canonical" href="https://wojakmeter.com" />
        <link rel="icon" href="/favicon.ico" />

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
        <meta name="twitter:site" content="@WojakMeter" />
        <meta name="twitter:creator" content="@WojakMeter" />

        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <Script
        id="wm-structured-data"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <Script src="/script.js?v=6" strategy="afterInteractive" />

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
                <label className="style-label" htmlFor="styleSelector">
                  Wojak Style
                </label>
                <select id="styleSelector" defaultValue="classic">
                  <option value="classic">Classic</option>
                  <option value="3d">3D</option>
                  <option value="anime">Anime</option>
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
              <h2>CRYPTO MARKET MOOD</h2>

              <div className="hero-grid hero-grid-single">
                <div className="hero-main">
                  <div className="wojak-stage">
                    <div className="sweat hidden" id="sweatFx">
                      💧
                    </div>

                    <div className="hero-social-badge" aria-label="Social sentiment">
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

                  <section className="emotion-bar-inline" id="emotionBarSection">
                    <div className="section-head section-head-tight">
                      <h3>WOJAKMETER BAR</h3>
                    </div>

                    <div className="emotion-track-wrap">
                      <div className="emotion-track" id="emotionTrack">
                        <div className="emotion-segment seg-frustration">Frustration</div>
                        <div className="emotion-segment seg-concern">Concern</div>
                        <div className="emotion-segment seg-doubt">Doubt</div>
                        <div className="emotion-segment seg-neutral">Neutral</div>
                        <div className="emotion-segment seg-optimism">Optimism</div>
                        <div className="emotion-segment seg-content">Content</div>
                        <div className="emotion-segment seg-euphoria">Euphoria</div>

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

                    <div className="emotion-meta">
                      <div className="emotion-meta-box">
                        <span>Current Mood</span>
                        <strong id="emotionBarMood">Neutral</strong>
                      </div>

                      <div className="emotion-meta-box">
                        <span>Score</span>
                        <strong id="emotionBarScore">50</strong>
                      </div>

                      <div className="emotion-meta-box">
                        <span>Range</span>
                        <strong id="emotionBarRange">45–59</strong>
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
                      <strong id="globalMarketTimeframe">1h</strong>
                    </div>
                  </div>

                  <div className="hero-share-row">
                    <button id="shareMoodBtn" className="action-btn share-x-btn" type="button">
                      Share mood on X
                    </button>
                  </div>

                  <div className="timeframes hero-timeframes" id="heroTimeframes">
                    <button data-timeframe="1m">1m</button>
                    <button data-timeframe="5m">5m</button>
                    <button data-timeframe="15m">15m</button>
                    <button data-timeframe="1h" className="active">
                      1h
                    </button>
                    <button data-timeframe="4h">4h</button>
                    <button data-timeframe="24h">24h</button>
                    <button data-timeframe="7d">7d</button>
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
                      <button data-timeframe="1m">1m</button>
                      <button data-timeframe="5m">5m</button>
                      <button data-timeframe="15m">15m</button>
                      <button data-timeframe="1h" className="active">
                        1h
                      </button>
                      <button data-timeframe="4h">4h</button>
                      <button data-timeframe="24h">24h</button>
                      <button data-timeframe="7d">7d</button>
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
                    Viewing 1h structure
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
                  <div className="pill positive" id="chartChangePill">
                    --
                  </div>
                  <div className="muted">
                    Selected timeframe: <span id="selectedTimeframe">1h</span>
                  </div>
                </div>

                <div className="market-intervals">
                  <div className="interval-box">
                    <span>1m</span>
                    <strong id="perf1m">--</strong>
                  </div>
                  <div className="interval-box">
                    <span>5m</span>
                    <strong id="perf5m">--</strong>
                  </div>
                  <div className="interval-box">
                    <span>15m</span>
                    <strong id="perf15m">--</strong>
                  </div>
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
                  <a href="#top-coins">Top Coins</a>
                  <a href="#market">Market Mood</a>
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
                    href="https://x.com/WojakMeter"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="x-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M18.244 2H21.5l-7.19 8.22L22 22h-6.84l-5.36-6.99L3.5 22H.244l7.68-8.77L2 2h6.93l4.85 6.41L18.244 2zm-1.2 18h1.9L7.02 4h-2l12.02 16z"
                        />
                      </svg>
                    </span>
                    @WojakMeter
                  </a>

                  <a href="mailto:contact@wojakmeter.com">contact@wojakmeter.com</a>
                  <a href="#">Telegram</a>
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

export async function getServerSideProps() {
  try {
    const headers = { accept: "application/json" };

    if (process.env.CG_API_KEY) {
      headers["x-cg-demo-api-key"] = process.env.CG_API_KEY;
    }

    const response = await fetch("https://api.coingecko.com/api/v3/global", { headers });
    const json = await response.json();
    const data = json?.data;

    const change = Number(data?.market_cap_change_percentage_24h_usd ?? 0);
    const volumeUsd = Number(data?.total_volume?.usd ?? 0);

    let score = Math.round(Math.max(0, Math.min(100, 50 + change * 10)));
    let mood = "neutral";

    if (score >= 85) mood = "euphoria";
    else if (score >= 70) mood = "content";
    else if (score >= 60) mood = "optimism";
    else if (score >= 45) mood = "neutral";
    else if (score >= 35) mood = "doubt";
    else if (score >= 20) mood = "concern";
    else mood = "frustration";

    const volumeCompact =
      volumeUsd >= 1e12
        ? `$${(volumeUsd / 1e12).toFixed(2)}T`
        : volumeUsd >= 1e9
          ? `$${(volumeUsd / 1e9).toFixed(2)}B`
          : volumeUsd >= 1e6
            ? `$${(volumeUsd / 1e6).toFixed(2)}M`
            : `$${volumeUsd.toFixed(0)}`;

    const ogImageUrl =
      `https://wojakmeter.com/api/og` +
      `?mood=${encodeURIComponent(mood)}` +
      `&score=${encodeURIComponent(score)}` +
      `&tf=1h` +
      `&change=${encodeURIComponent(change.toFixed(2))}` +
      `&volume=${encodeURIComponent(volumeCompact)}` +
      `&coin=BTC` +
      `&style=classic`;

    return {
      props: {
        ogImageUrl
      }
    };
  } catch {
    return {
      props: {
        ogImageUrl:
          "https://wojakmeter.com/api/og?mood=neutral&score=50&tf=1h&change=0&volume=%24--&coin=BTC&style=classic"
      }
    };
  }
}