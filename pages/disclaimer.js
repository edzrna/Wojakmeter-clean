import Head from "next/head";
import Link from "next/link";

export default function DisclaimerPage() {
  return (
    <>
      <Head>
        <title>Disclaimer | WojakMeter</title>
        <meta
          name="description"
          content="Disclaimer for WojakMeter. Crypto market emotion data is for informational and entertainment purposes only."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://wojakmeter.com/disclaimer" />
      </Head>

      <main className="legal-page">
        <div className="legal-shell">
          <div className="legal-topbar">
            <Link href="/" className="legal-brand">
              <img
                src="/assets/logo/wojakmeter_logo.png"
                className="legal-logo"
                alt="WojakMeter Logo"
              />
            </Link>

            <Link href="/" className="legal-back">
              ← Back
            </Link>
          </div>

          <section className="legal-hero">
            <span className="legal-label">Disclaimer</span>
            <h1 className="legal-title">Disclaimer</h1>
            <p className="legal-subtitle">
              WojakMeter tracks market emotion. It does not predict outcomes.
            </p>

            <div className="legal-meta">
              <span className="legal-pill">Not financial advice</span>
              <span className="legal-pill">Entertainment + information only</span>
            </div>
          </section>

          <div className="legal-grid">
            <section className="legal-card">
              <h2>Not Financial Advice</h2>
              <p>
                This site is for informational and entertainment purposes only.
                Nothing on WojakMeter should be considered financial, investment,
                legal, or tax advice.
              </p>
            </section>

            <section className="legal-card">
              <h2>Market Risk</h2>
              <p>
                Crypto markets are highly volatile. Prices can move rapidly and
                unpredictably. You may lose part or all of your capital.
              </p>
            </section>

            <section className="legal-card">
              <h2>No Guarantees</h2>
              <p>
                WojakMeter does not guarantee accuracy, completeness,
                profitability, future performance, or market outcomes.
              </p>
            </section>

            <section className="legal-card">
              <h2>Sentiment Is Not Certainty</h2>
              <p>
                Emotional or sentiment-based indicators are interpretive tools.
                They are designed to help visualize market psychology, not to
                provide certain predictions or trading signals.
              </p>
            </section>

            <section className="legal-card">
              <h2>Use at Your Own Risk</h2>
              <p>
                Any decisions you make based on the content, charts, mood scores,
                narratives, or other material on this website are your sole
                responsibility.
              </p>
            </section>

            <section className="legal-card">
              <h2>Third-Party Data</h2>
              <p>
                WojakMeter may rely on third-party APIs, market feeds, and
                external services. We are not responsible for delays,
                interruptions, inaccuracies, or missing data from those sources.
              </p>
            </section>

            <section className="legal-card">
              <h2>No Liability</h2>
              <p>
                WojakMeter and its creators are not liable for any losses,
                damages, or decisions made in connection with the use of this
                website.
              </p>
            </section>

            <section className="legal-card">
              <h2>Contact</h2>
              <p>
                Questions about this disclaimer can be sent to{" "}
                <a className="legal-contact" href="mailto:contact@wojakmeter.com">
                  contact@wojakmeter.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}