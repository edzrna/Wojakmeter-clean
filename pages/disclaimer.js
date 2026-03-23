import Link from "next/link";

export default function DisclaimerPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">

        <div className="legal-topbar">
          <Link href="/" className="legal-brand">
            <img src="/logo.png" className="legal-logo" />
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
          <span className="legal-label">Disclaimer</span>
          <h1 className="legal-title">Disclaimer</h1>
          <p className="legal-subtitle">
            WojakMeter tracks market emotion. It does not predict outcomes.
          </p>

          <div className="legal-meta">
            <span className="legal-pill">Not financial advice</span>
          </div>
        </section>

        <div className="legal-grid">

          <section className="legal-card">
            <h2>Not Financial Advice</h2>
            <p>
              This site is for informational and entertainment purposes only.
            </p>
          </section>

          <section className="legal-card">
            <h2>Market Risk</h2>
            <p>
              Crypto is volatile. You may lose money.
            </p>
          </section>

          <section className="legal-card">
            <h2>No Guarantees</h2>
            <p>
              No predictions or guarantees are made.
            </p>
          </section>

          <section className="legal-card">
            <h2>User Responsibility</h2>
            <p>
              You are responsible for your own decisions.
            </p>
          </section>

        </div>

      </div>
    </main>
  );
}