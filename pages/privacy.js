import Link from "next/link";

export default function PrivacyPage() {
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
          <span className="legal-label">Privacy</span>
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-subtitle">
            How we collect and use limited data when you use WojakMeter.
          </p>

          <div className="legal-meta">
            <span className="legal-pill">Last updated: March 2026</span>
          </div>
        </section>

        <div className="legal-grid">

          <section className="legal-card">
            <h2>1. Data Collected</h2>
            <ul>
              <li>IP address</li>
              <li>Browser & device info</li>
              <li>Usage data</li>
            </ul>
          </section>

          <section className="legal-card">
            <h2>2. Usage</h2>
            <p>
              Data is used to improve performance, analytics, and user experience.
            </p>
          </section>

          <section className="legal-card">
            <h2>3. Cookies</h2>
            <p>
              We may use cookies for analytics and preferences.
            </p>
          </section>

          <section className="legal-card">
            <h2>4. Sharing</h2>
            <p>
              We do not sell your data.
            </p>
          </section>

          <section className="legal-card">
            <h2>Contact</h2>
            <p>
              contact@wojakmeter.com
            </p>
          </section>

        </div>

      </div>
    </main>
  );
}