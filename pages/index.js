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
      </Head>

      <Script
        id="wm-structured-data"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <Script src="/script.js" strategy="afterInteractive" />

      <div className="style-3d">
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
                <select id="styleSelector" defaultValue="3d">
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

                    <div className="hero-social-badge social-neutral" aria-label="Social sentiment">
                      <div className="hero-social-badge-label">𝕏</div>
                      <div className="hero-social-badge-icon">
                        <img
                          id="socialIconImg"
                          className="mood-icon-img anim-float"
                          src="/assets/icons/3d/neutral.png"
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
                      src="/assets/hero/3d/neutral.png"
                      alt="Global market mood"
                    />
                  </div>

                  <div className="hero-mood mood-neutral" id="heroMood">
                    Neutral
                  </div>

                  <div className="hero-score" id="heroScoreWrap">
                    <span id="heroScore"></span>
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
                              src="/assets/icons/3d/neutral.png"
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
                    <button id="shareMoodBtn" className="share-x-btn" type="button">
                      <span className="share-icon">𝕏</span>
                      <span className="share-text">Share Market Mood</span>
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
                      src="/assets/icons/3d/neutral.png"
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
                      src="/assets/icons/3d/neutral.png"
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
                  <div className="muted" id="chartFooterTimeframe">
                    <span id="selectedTimeframe">1h</span>
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

            <section className="scale-card card">
              <h3>EMOTIONAL SCALE</h3>
              <div className="scale-grid" id="scaleGrid"></div>
            </section>
          </main>

          <div id="mobileMoodDock" className="mobile-mood-dock hidden collapsed">
            <button id="mobileMoodDockToggle" className="mobile-mood-dock-toggle" type="button">
              <span className="mobile-mood-dock-handle"></span>
              <span className="mobile-mood-dock-mini">
                <img
                  id="mobileDockMoodIcon"
                  src="/assets/icons/3d/neutral.png"
                  alt="Current mood"
                />
                <span id="mobileDockDriverMini">Market flow / price action</span>
              </span>
            </button>

            <div id="mobileMoodDockBody" className="mobile-mood-dock-body">
              <div className="mobile-mood-dock-header">
                <div className="mobile-mood-dock-title">WOJAKMETER</div>
                <div id="mobileDockMoodLabel" className="mobile-mood-dock-mood mood-neutral">
                  Neutral
                </div>
              </div>

              <div className="mobile-dock-track-wrap">
                <div className="emotion-track mobile-dock-track">
                  <div className="emotion-segment seg-frustration">Frustration</div>
                  <div className="emotion-segment seg-concern">Concern</div>
                  <div className="emotion-segment seg-doubt">Doubt</div>
                  <div className="emotion-segment seg-neutral">Neutral</div>
                  <div className="emotion-segment seg-optimism">Optimism</div>
                  <div className="emotion-segment seg-content">Content</div>
                  <div className="emotion-segment seg-euphoria">Euphoria</div>

                  <div className="emotion-pointer" id="mobileDockPointer" aria-label="Mobile dock indicator">
                    <div className="emotion-pointer-arrow"></div>
                    <div className="emotion-pointer-face">
                      <img
                        id="mobileDockPointerImg"
                        src="/assets/icons/3d/neutral.png"
                        alt="Current emotional state"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mobile-dock-meta">
                <div className="mobile-dock-meta-box">
                  <span>Range</span>
                  <strong id="mobileDockRange">45–59</strong>
                </div>

                <div className="mobile-dock-meta-box">
                  <span>Driver</span>
                  <strong id="mobileDockDriver">Market flow / price action</strong>
                </div>
              </div>

              <div className="timeframes hero-timeframes mobile-dock-timeframes" id="mobileDockTimeframes">
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

              <div className="mobile-dock-driver-wrap">
                <label htmlFor="mobileDockDriverSelect">Market Driver</label>
                <select id="mobileDockDriverSelect" defaultValue="market_flow">
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
            </div>
          </div>

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
                    className="footer-link"
                  >
                    @WojakMeter
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

export async function getServerSideProps() {
  try {
    return {
      props: {
        ogImageUrl:
          "https://wojakmeter.com/api/og?mood=neutral&score=50&tf=1h&change=0&volume=%24--&coin=BTC&style=3d"
      }
    };
  } catch {
    return {
      props: {
        ogImageUrl:
          "https://wojakmeter.com/api/og?mood=neutral&score=50&tf=1h&change=0&volume=%24--&coin=BTC&style=3d"
      }
    };
  }
}