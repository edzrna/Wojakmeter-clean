import Head from "next/head";
import Link from "next/link";

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Terms | WojakMeter</title>

        <meta
          name="description"
          content="WojakMeter terms of service."
        />

        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/style.css?v=6" />
      </Head>

      <main className="legal-page">
        <div className="legal-shell">
          <div className="legal-topbar">
            <Link href="/" className="legal-brand">
              <img
                src="/assets/logo/wojakmeter_logo.png"
                alt="WojakMeter Logo"
                className="legal-logo"
              />
              <div className="legal-brand-copy">
                <strong>WojakMeter</strong>
                <span>The Crypto Emotion Index</span>
              </div>
            </Link>

            <Link href="/" className="legal-back">
              ← Back
            </Link>
          </div>

          <section className="legal-hero">
            <span className="legal-label">Terms</span>
            <h1 className="legal-title">Terms of Service</h1>
            <p className="legal-subtitle">
              These terms govern your use of WojakMeter and its sentiment-based
              crypto analysis.
            </p>

            <div className="legal-meta">
              <span className="legal-pill">Last updated: March 2026</span>
              <span className="legal-pill">We track emotions, not outcomes.</span>
            </div>
          </section>

          <div className="legal-grid">
            <section className="legal-card">
              <h2>1. Description of Service</h2>
              <p>
                WojakMeter provides a crypto market sentiment and emotion index
                based on price, social, and macro signals.
              </p>
            </section>

            <section className="legal-card">
              <h2>2. No Financial Advice</h2>
              <p>
                This platform does not provide financial advice or trading
                signals. All content is informational only.
              </p>
            </section>

            <section className="legal-card">
              <h2>3. Risk Disclosure</h2>
              <p>
                Crypto markets are highly volatile. You may lose capital.
                Always do your own research.
              </p>
            </section>

            <section className="legal-card">
              <h2>4. Data Accuracy</h2>
              <p>
                Data may be delayed, incomplete, or inaccurate due to
                third-party sources.
              </p>
            </section>

            <section className="legal-card">
              <h2>5. Liability</h2>
              <p>
                WojakMeter is not responsible for financial losses or trading
                decisions.
              </p>
            </section>

            <section className="legal-card">
              <h2>Contact</h2>
              <p>
                <a
                  href="mailto:contact@wojakmeter.com"
                  className="legal-contact"
                >
                  contact@wojakmeter.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}