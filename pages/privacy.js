import Head from "next/head";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy | WojakMeter</title>
        <meta
          name="description"
          content="Privacy Policy for WojakMeter. Learn what limited data may be collected and how it is used."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://wojakmeter.com/privacy" />
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
              <p>
                We may collect limited technical and usage information when you
                visit or interact with WojakMeter.
              </p>
              <ul>
                <li>IP address</li>
                <li>Browser and device information</li>
                <li>Pages visited and general usage activity</li>
                <li>Performance and diagnostic data</li>
              </ul>
            </section>

            <section className="legal-card">
              <h2>2. How We Use Data</h2>
              <p>
                Data may be used to operate the website, improve performance,
                understand usage patterns, fix bugs, and improve the overall user
                experience.
              </p>
            </section>

            <section className="legal-card">
              <h2>3. Cookies</h2>
              <p>
                We may use cookies or similar technologies for analytics,
                preferences, and essential website functionality.
              </p>
            </section>

            <section className="legal-card">
              <h2>4. Data Sharing</h2>
              <p>
                We do not sell your personal data. Limited information may be
                processed by third-party services used for hosting, analytics,
                security, or infrastructure.
              </p>
            </section>

            <section className="legal-card">
              <h2>5. Third-Party Services</h2>
              <p>
                WojakMeter may rely on external providers such as hosting
                services, analytics tools, APIs, or performance monitoring
                platforms. These services may process technical information as
                part of normal website operation.
              </p>
            </section>

            <section className="legal-card">
              <h2>6. Data Security</h2>
              <p>
                We take reasonable steps to protect website and usage data, but
                no online service can guarantee absolute security.
              </p>
            </section>

            <section className="legal-card">
              <h2>7. Your Choice</h2>
              <p>
                You can limit certain browser-based tracking features through your
                browser settings, including cookies where supported.
              </p>
            </section>

            <section className="legal-card">
              <h2>Contact</h2>
              <p>
                For privacy-related questions, contact{" "}
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