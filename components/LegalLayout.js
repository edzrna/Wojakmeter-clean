import Head from "next/head";
import Link from "next/link";

/**
 * Estructura compartida de las tres páginas legales.
 *
 * Antes cada página repetía cabecera, hero y meta. Eso hacía que
 * cualquier cambio hubiera que aplicarlo tres veces, y por eso las
 * tres tenían fechas y metadatos distintos.
 */

const LEGAL_PAGES = [{
  href: "/terms",
  label: "Terms"
}, {
  href: "/privacy",
  label: "Privacy"
}, {
  href: "/disclaimer",
  label: "Disclaimer"
}];
export const LAST_UPDATED = "August 2026";
export function LegalSection({
  id,
  title,
  children
}) {
  return <section className="legal-section" id={id}>
      <h2>
        <a className="legal-anchor" href={`#${id}`}>
          {title}
        </a>
      </h2>
      {children}
    </section>;
}
export default function LegalLayout({
  label,
  title,
  subtitle,
  description,
  path,
  pills = [],
  sections = [],
  children
}) {
  const url = `https://wojakmeter.com${path}`;
  return <>
      <Head>
        <title>{`${title} | WojakMeter`}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${title} | WojakMeter`} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta name="twitter:card" content="summary" />
      </Head>

      <main className="legal-page">
        <div className="legal-shell">
          <div className="legal-topbar">
            <a href="/" className="legal-brand">
              <img src="/assets/logo/wojakmeter_logo.png" className="legal-logo" alt="WojakMeter" />
              <div className="legal-brand-copy">
                <strong>WojakMeter</strong>
                <span>The Crypto Emotion Index</span>
              </div>
            </a>

            <a href="/" className="legal-back">
              ← Back to site
            </a>
          </div>

          <header className="legal-hero">
            <span className="legal-label">{label}</span>
            <h1 className="legal-title">{title}</h1>
            <p className="legal-subtitle">{subtitle}</p>

            <div className="legal-meta">
              <span className="legal-pill">Last updated: {LAST_UPDATED}</span>
              {pills.map(pill => <span className="legal-pill" key={pill}>
                  {pill}
                </span>)}
            </div>

            {/* Las tres páginas se enlazan entre sí: antes estaban
                aisladas y sólo se llegaba a ellas desde el pie. */}
            <nav className="legal-tabs" aria-label="Legal documents">
              {LEGAL_PAGES.map(page => <Link key={page.href} href={page.href} className={`legal-tab${page.href === path ? " is-current" : ""}`} aria-current={page.href === path ? "page" : undefined}>
                  {page.label}
                </Link>)}
            </nav>
          </header>

          <div className="legal-body">
            {sections.length > 0 && <aside className="legal-toc" aria-label="On this page">
                <span className="legal-toc-title">On this page</span>
                <ol>
                  {sections.map(section => <li key={section.id}>
                      <a href={`#${section.id}`}>{section.title}</a>
                    </li>)}
                </ol>
              </aside>}

            <div className="legal-doc">{children}</div>
          </div>

          <footer className="legal-foot">
            <p>
              Questions about this document:{" "}
              <a className="legal-contact" href="mailto:contact@wojakmeter.com">
                contact@wojakmeter.com
              </a>
            </p>
            <p className="legal-foot-note">
              WojakMeter is an independent project. It is not affiliated with,
              endorsed by, or sponsored by any exchange, data provider, or token
              issuer referenced on the site.
            </p>
          </footer>
        </div>
      </main>
    </>;
}
