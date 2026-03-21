import Head from "next/head";
import Script from "next/script";

const htmlContent = `
<div class="app-shell">
  <header class="topbar cardless" id="market">
    <div class="topbar-left">
      <img src="/assets/logo/wojakmeter_logo.png" alt="WojakMeter Logo" class="logo-img">
    </div>

    <div class="topbar-right-group">
      <div class="topbar-center">
        <div class="market-stat">BTC.D <strong id="btcDominance">--</strong></div>
        <div class="market-stat">Market Cap <strong id="headerMarketCap">--</strong></div>
        <div class="market-stat">24H Volume <strong id="headerVolume">--</strong></div>
      </div>

      <div class="topbar-right">
        <label class="style-label" for="styleSelector">Wojak Style</label>
        <select id="styleSelector">
          <option value="classic" selected>Classic</option>
          <option value="3d">3D</option>
          <option value="anime">Anime</option>
          <option value="minimal">Minimal</option>
        </select>
      </div>
    </div>
  </header>

  <div class="ticker-bar" id="tickerBar">
    <span>Loading market...</span>
  </div>

  <main class="dashboard">
    <section class="hero card">
      <h2>CRYPTO MARKET MOOD</h2>

      <div class="hero-grid hero-grid-single">
        <div class="hero-main">
          <div class="wojak-stage">
            <div class="sweat hidden" id="sweatFx">💧</div>

            <div class="hero-social-badge" aria-label="Social sentiment">
              <div class="hero-social-badge-label">𝕏</div>
              <div class="hero-social-badge-icon">
                <img
                  id="socialIconImg"
                  class="mood-icon-img anim-float"
                  src="/assets/icons/classic/neutral.png"
                  alt="Social mood icon"
                />
              </div>
              <div class="hero-social-badge-text">
                <span id="socialMoodMini">Neutral</span>
                <strong id="socialScoreMini">50</strong>
              </div>
            </div>

            <img
              id="heroFaceImg"
              class="hero-face-img anim-float"
              src="/assets/hero/classic/neutral.png"
              alt="Global market mood"
            />
          </div>

          <div class="hero-mood mood-neutral" id="heroMood">Neutral</div>

          <div class="hero-score" id="heroScoreWrap">
            Score: <span id="heroScore">50</span> / 100
          </div>

          <div class="heartbeat-wrap" id="heartbeatWrap">
            <div class="heartbeat-heart" id="heartbeatHeart">❤</div>
            <div class="heartbeat-chart">
              <svg viewBox="0 0 320 56" preserveAspectRatio="none" aria-hidden="true">
                <path id="heartbeatPath" d=""></path>
              </svg>
            </div>
          </div>

          <section class="emotion-bar-inline" id="emotionBarSection">
            <div class="section-head section-head-tight">
              <h3>WOJAKMETER BAR</h3>
            </div>

            <div class="emotion-track-wrap">
              <div class="emotion-track" id="emotionTrack">
                <div class="emotion-segment seg-frustration">Frustration</div>
                <div class="emotion-segment seg-concern">Concern</div>
                <div class="emotion-segment seg-doubt">Doubt</div>
                <div class="emotion-segment seg-neutral">Neutral</div>
                <div class="emotion-segment seg-optimism">Optimism</div>
                <div class="emotion-segment seg-content">Content</div>
                <div class="emotion-segment seg-euphoria">Euphoria</div>

                <div class="emotion-pointer" id="emotionPointer" aria-label="WojakMeter indicator">
                  <div class="emotion-pointer-arrow"></div>
                  <div class="emotion-pointer-face">
                    <img
                      id="emotionPointerImg"
                      src="/assets/icons/classic/neutral.png"
                      alt="Current emotional state"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="emotion-meta">
              <div class="emotion-meta-box">
                <span>Current Mood</span>
                <strong id="emotionBarMood">Neutral</strong>
              </div>

              <div class="emotion-meta-box">
                <span>Score</span>
                <strong id="emotionBarScore">50</strong>
              </div>

              <div class="emotion-meta-box">
                <span>Range</span>
                <strong id="emotionBarRange">45–59</strong>
              </div>
            </div>
          </section>

          <div class="hero-market-line">
            <div class="hero-line-item">
              <span>Market Change</span>
              <strong id="globalMarketChange">--</strong>
            </div>
            <div class="hero-line-sep"></div>
            <div class="hero-line-item">
              <span>Volume</span>
              <strong id="globalMarketVolume" class="header-accent">--</strong>
            </div>
            <div class="hero-line-sep"></div>
            <div class="hero-line-item">
              <span>Timeframe</span>
              <strong id="globalMarketTimeframe">1h</strong>
            </div>
          </div>

          <div class="hero-share-row">
            <button id="shareMoodBtn" class="action-btn share-x-btn" type="button">
              Share mood on X
            </button>
          </div>

          <div class="timeframes hero-timeframes" id="heroTimeframes">
            <button data-timeframe="1m">1m</button>
            <button data-timeframe="5m">5m</button>
            <button data-timeframe="15m">15m</button>
            <button data-timeframe="1h" class="active">1h</button>
            <button data-timeframe="4h">4h</button>
            <button data-timeframe="24h">24h</button>
            <button data-timeframe="7d">7d</button>
          </div>
        </div>

        <section class="drivers-card card">
          <div class="section-head">
            <h3>MARKET DRIVERS</h3>
          </div>

          <div class="drivers-controls">
            <label for="macroDriver">Main macro driver</label>
            <select id="macroDriver">
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

          <div class="driver-list">
            <div class="driver-item">
              <span>Macro Driver</span>
              <strong id="driverMacro">Market flow / price action</strong>
            </div>

            <div class="driver-item">
              <span>Main Narrative</span>
              <strong id="driverNarrative">Waiting for live market data.</strong>
            </div>

            <div class="driver-item">
              <span>Timeframe Reaction</span>
              <strong id="driverTimeframeReaction">Balanced reaction</strong>
            </div>

            <div class="driver-item">
              <span>Risk Tone</span>
              <strong id="driverRiskTone">Neutral</strong>
            </div>
          </div>
        </section>
      </div>
    </section>

    <section class="top-coins card" id="top-coins">
      <div class="section-head">
        <h3>MARKET SECTIONS</h3>
        <span class="muted">Live market overview</span>
      </div>

      <div class="tabs-row" id="marketTabs">
        <button class="tab-btn active" data-tab="coins">Top 10 Coins</button>
        <button class="tab-btn" data-tab="trending">Trending Coins 🔥</button>
        <button class="tab-btn" data-tab="memes">Top Meme Coins</button>
      </div>

      <div class="tab-panel active" id="tab-coins">
        <div class="coins-grid" id="coinsGrid"></div>
      </div>

      <div class="tab-panel" id="tab-trending">
        <div class="coins-grid" id="trendingGrid"></div>
      </div>

      <div class="tab-panel" id="tab-memes">
        <div class="coins-grid" id="memesGrid"></div>
      </div>
    </section>

    <section class="detail-grid detail-grid-single">
      <section class="chart-card card">
        <div class="chart-topbar">
          <div class="chart-coin-meta">
            <div class="chart-coin-icon-wrap">
              <img id="chartCoinIcon" class="chart-coin-icon" src="" alt="Coin icon">
            </div>

            <div class="chart-coin-copy">
              <div class="chart-coin-title-line">
                <h3 id="chartTitle">BTC / Bitcoin</h3>
                <span class="muted" id="chartRenderMode">Line chart</span>
              </div>

              <div class="chart-coin-stats">
                <div class="chart-mini-stat">
                  <span>Price</span>
                  <strong id="chartCoinPrice">--</strong>
                </div>
                <div class="chart-mini-stat">
                  <span>Volume</span>
                  <strong id="chartCoinVolume">--</strong>
                </div>
                <div class="chart-mini-stat">
                  <span>Market Cap</span>
                  <strong id="chartCoinMarketCap">--</strong>
                </div>
              </div>
            </div>
          </div>

          <div class="chart-toolbar">
            <div class="timeframes compact" id="chartTimeframes">
              <button data-timeframe="1m">1m</button>
              <button data-timeframe="5m">5m</button>
              <button data-timeframe="15m">15m</button>
              <button data-timeframe="1h" class="active">1h</button>
              <button data-timeframe="4h">4h</button>
              <button data-timeframe="24h">24h</button>
              <button data-timeframe="7d">7d</button>
            </div>

            <div class="chart-mode-switch" id="chartModeSwitch">
              <button class="chart-mode-btn active" data-mode="line">Line</button>
              <button class="chart-mode-btn" data-mode="candle">Candles</button>
            </div>
          </div>
        </div>

        <div class="chart-inline-moods">
          <div class="chart-mood-chip">
            <img
              id="coinMoodIconImg"
              class="chart-mood-chip-icon mood-icon-img anim-float"
              src="/assets/icons/classic/neutral.png"
              alt="Technical mood icon"
            />
            <div>
              <span>Technical</span>
              <strong id="coinMoodLabel">Neutral</strong>
            </div>
          </div>

          <div class="chart-mood-chip">
            <img
              id="detailSocialIconImg"
              class="chart-mood-chip-icon mood-icon-img anim-float"
              src="/assets/icons/classic/neutral.png"
              alt="Social mood icon"
            />
            <div>
              <span>Social</span>
              <strong id="detailSocialLabel">Neutral</strong>
            </div>
          </div>

          <div class="chart-mood-chip chart-mood-chip-performance">
            <div>
              <span>Performance</span>
              <strong id="selectedPerformance">--</strong>
            </div>
          </div>
        </div>

        <div class="chart-placeholder">
          <div class="chart-time-label" id="chartTimeLabel">Viewing 1h structure</div>

          <svg id="coinChartSvg" viewBox="0 0 900 280" preserveAspectRatio="none" aria-hidden="true">
            <path id="coinChartArea" d=""></path>
            <path id="coinChartPath" d=""></path>
            <g id="coinChartCandles"></g>
          </svg>
        </div>

        <div class="chart-footer">
          <div class="pill positive" id="chartChangePill">--</div>
          <div class="muted">Selected timeframe: <span id="selectedTimeframe">1h</span></div>
        </div>

        <div class="market-intervals">
          <div class="interval-box"><span>1m</span><strong id="perf1m">--</strong></div>
          <div class="interval-box"><span>5m</span><strong id="perf5m">--</strong></div>
          <div class="interval-box"><span>15m</span><strong id="perf15m">--</strong></div>
          <div class="interval-box"><span>1h</span><strong id="perf1h">--</strong></div>
          <div class="interval-box"><span>4h</span><strong id="perf4h">--</strong></div>
          <div class="interval-box"><span>24h</span><strong id="perf24h">--</strong></div>
          <div class="interval-box"><span>7d</span><strong id="perf7d">--</strong></div>
        </div>
      </section>
    </section>

    <section class="studio-card card" id="wojak-studio">
      <div class="section-head">
        <h3>WOJAK STUDIO</h3>
        <span class="muted">Create content from live market sentiment</span>
      </div>

      <div class="tabs-row" id="studioTabs">
        <button class="tab-btn active" data-studio-tab="meme">Meme Generator</button>
        <button class="tab-btn" data-studio-tab="daily">Daily Market Meme</button>
        <button class="tab-btn" data-studio-tab="xpost">X Post Generator</button>
        <button class="tab-btn" data-studio-tab="story">Story Mode</button>
      </div>

      <div class="studio-panel active" id="studio-meme">
        <div class="studio-grid">
          <div class="studio-box">
            <div class="studio-box-head">
              <h4>Meme Prompt</h4>
              <button class="action-btn studio-copy-btn" data-copy-target="memePromptOutput">Copy</button>
            </div>
            <pre class="studio-output" id="memePromptOutput">Loading...</pre>
          </div>

          <div class="studio-box">
            <div class="studio-box-head">
              <h4>Scene Summary</h4>
              <button class="action-btn studio-copy-btn" data-copy-target="memeSceneOutput">Copy</button>
            </div>
            <div class="studio-output prose-output" id="memeSceneOutput">Loading...</div>
          </div>
        </div>
      </div>

      <div class="studio-panel" id="studio-daily">
        <div class="studio-grid studio-grid-single">
          <div class="studio-box">
            <div class="studio-box-head">
              <h4>Daily Market Meme</h4>
              <button class="action-btn studio-copy-btn" data-copy-target="dailyMemeOutput">Copy</button>
            </div>
            <div class="studio-output prose-output" id="dailyMemeOutput">Loading...</div>
          </div>
        </div>
      </div>

      <div class="studio-panel" id="studio-xpost">
        <div class="studio-grid">
          <div class="studio-box">
            <div class="studio-box-head">
              <h4>X Caption</h4>
              <button class="action-btn studio-copy-btn" data-copy-target="xPostCaptionOutput">Copy</button>
            </div>
            <div class="studio-output prose-output" id="xPostCaptionOutput">Loading...</div>
          </div>

          <div class="studio-box">
            <div class="studio-box-head">
              <h4>Alt Text</h4>
              <button class="action-btn studio-copy-btn" data-copy-target="xPostAltOutput">Copy</button>
            </div>
            <div class="studio-output prose-output" id="xPostAltOutput">Loading...</div>
          </div>

          <div class="studio-box">
            <div class="studio-box-head">
              <h4>Hashtags</h4>
              <button class="action-btn studio-copy-btn" data-copy-target="xPostTagsOutput">Copy</button>
            </div>
            <div class="studio-output prose-output" id="xPostTagsOutput">Loading...</div>
          </div>
        </div>
      </div>

      <div class="studio-panel" id="studio-story">
        <div class="studio-grid studio-grid-single">
          <div class="studio-box">
            <div class="studio-box-head">
              <h4>Market Story</h4>
              <button class="action-btn studio-copy-btn" data-copy-target="storyModeOutput">Copy</button>
            </div>
            <div class="studio-output prose-output" id="storyModeOutput">Loading...</div>
          </div>
        </div>
      </div>
    </section>

    <section class="scale-card card">
      <h3>EMOTIONAL SCALE</h3>
      <div class="scale-grid" id="scaleGrid"></div>
    </section>

    <section id="about" class="about-section">
      <h2>About WojakMeter</h2>
      <p>
        WojakMeter is a crypto market sentiment index designed to measure the emotional state of the cryptocurrency market in real time.
        The platform analyzes price momentum, social sentiment and macroeconomic drivers to identify the prevailing mood across the crypto ecosystem.
      </p>
      <p>
        Financial markets are strongly influenced by psychology. Fear, uncertainty, optimism and euphoria often drive market cycles more than fundamentals.
        WojakMeter translates these complex behavioral patterns into a simple visual indicator that helps traders quickly understand the emotional dynamics of the market.
      </p>
      <p>
        The index represents market emotions through seven emotional stages ranging from Frustration to Euphoria, helping traders interpret the emotional behavior that often drives crypto market cycles.
      </p>
    </section>
  </main>

  <footer class="footer">
    <div class="footer-grid">
      <div class="footer-brand">
        <img src="/assets/logo/wojakmeter_logo.png" class="footer-logo" alt="WojakMeter Logo">
        <p>
          WojakMeter is a crypto market sentiment index that visualizes the emotional state of the cryptocurrency market using price momentum, social sentiment and macro drivers.
        </p>
      </div>

      <div class="footer-links">
        <h4>Navigation</h4>
        <a href="#about">About</a>
        <a href="#top-coins">Top Coins</a>
        <a href="#market">Market Mood</a>
        <a href="#wojak-studio">Wojak Studio</a>
        <a href="#">Terms</a>
      </div>

      <div class="footer-links">
        <h4>Community</h4>
        <a href="https://x.com/WojakMeter" target="_blank" rel="noopener">X / Twitter</a>
        <a href="#">Telegram</a>
      </div>
    </div>

    <div class="footer-bottom">
      <p>© 2026 WojakMeter. All rights reserved.</p>
    </div>
  </footer>
</div>
`;

export default function Home() {
  return (
    <>
      <Head>
        <title>WojakMeter | Crypto Market Sentiment & Emotion Index</title>
        <meta
          name="description"
          content="WojakMeter tracks the emotional state of the crypto market using price momentum, social sentiment and macro events."
        />
        <meta
          name="keywords"
          content="crypto sentiment, bitcoin sentiment, crypto emotion index, crypto market mood, fear and greed crypto, wojakmeter"
        />

        <meta property="og:title" content="WojakMeter | The Crypto Emotion Index" />
        <meta
          property="og:description"
          content="Track the emotional state of the crypto market using price momentum, social sentiment and macro events."
        />
        <meta property="og:image" content="https://wojakmeter.com/assets/preview.jpg" />
        <meta property="og:url" content="https://wojakmeter.com" />
        <meta property="og:type" content="website" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="WojakMeter | Crypto Emotion Index" />
        <meta
          name="twitter:description"
          content="Track the emotional state of the crypto market with WojakMeter."
        />
        <meta name="twitter:image" content="https://wojakmeter.com/assets/preview