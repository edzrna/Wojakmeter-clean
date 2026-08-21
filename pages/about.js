import Head from "next/head";
import Link from "next/link";

/**
 * /about — quién construyó esto.
 *
 * El orden importa: primero el trabajo, después la persona. Un visitante
 * que llega desde el índice tiene que ver de qué está hecho el producto
 * antes de enterarse de que hay alguien disponible detrás.
 */

const BUILD = [
  {
    kicker: "The index",
    title: "Six components, not one number pulled from the air",
    body: "Return, breadth, volatility regime, volume anomaly, dominance rotation and headline tone, each measured separately and weighted (0.30 / 0.22 / 0.15 / 0.13 / 0.10 / 0.10). Every component is normalized with a robust z-score against a 90-day window, then mapped through a fixed tanh curve so the scale stays comparable over time. When a signal goes missing its weight is redistributed; when too much is missing the engine returns nothing rather than inventing a 50.",
  },
  {
    kicker: "The character",
    title: "One face, twenty-one readings",
    body: "A four-axis rig — valence, activation, tension, fatigue — picks a sub-emotion from seven base moods and modulates speed, tremor, tilt and desaturation to produce twenty-one distinct readings from seven sprite sheets per style. Idle loops run at 24 frames on a 6×4 grid, generated with a mesh-deformation script for the Classic style and per-cell LED switching for Synth.",
  },
  {
    kicker: "The game",
    title: "Emotion Rush, with the scores verified server-side",
    body: "A reaction game where the market's live state tints the board and sets the tempo. Scores are validated on the server before they reach the leaderboard, because a client-side high score is just a number someone typed. The break-up sprites — seven strips of eight frames — are generated in code with a Voronoi fracture, the core separated from the shell and the incandescence baked into the fragment edges.",
  },
  {
    kicker: "The plumbing",
    title: "Test harnesses, because a syntax check is not a test",
    body: "Several smoke harnesses load the real modules against a simulated DOM and assert their behaviour — the game, the hero rig, the canonical index, the history endpoint, the preview workshop. Together they run around 170 checks. They have caught a stub that made tests pass while the code was broken, and live functions deleted during a cleanup. Snapshots are written every fifteen minutes by a scheduled job.",
  },
];

export default function AboutPage() {
  const title = "About | WojakMeter";
  const description =
    "WojakMeter is an independent crypto emotion index built by one person. Here is what runs underneath it.";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://wojakmeter.com/about" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content="https://wojakmeter.com/about" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <main className="about-page">
        <div className="about-shell">
          <div className="about-topbar">
            <Link href="/" className="about-brand">
              <img
                src="/assets/logo/wojakmeter_logo.png"
                className="about-logo"
                alt="WojakMeter"
              />
              <div className="about-brand-copy">
                <strong>WojakMeter</strong>
                <span>The Crypto Emotion Index</span>
              </div>
            </Link>

            <Link href="/" className="about-back">
              ← Back to site
            </Link>
          </div>

          <header className="about-hero">
            <span className="about-label">About</span>
            <h1 className="about-title">
              One person
              <br />
              built this.
            </h1>
            <p className="about-lede">
              WojakMeter reads the crypto market and puts the result on a face.
              Not a mood board — a measured composite index, recalculated every
              fifteen minutes, expressed through a character that actually
              reacts. Every part of it, from the index engine to the sprite
              sheets, was designed and written by one developer.
            </p>
          </header>

          <section className="about-build">
            {BUILD.map((item) => (
              <article className="about-block" key={item.kicker}>
                <span className="about-kicker">{item.kicker}</span>
                <h2>{item.title}</h2>
                <p>{item.body}</p>
              </article>
            ))}
          </section>

          <section className="about-honest">
            <h2>What it isn&rsquo;t</h2>
            <p>
              It is not a signal service and it does not predict anything. The
              index describes conditions that already happened — that is the
              whole design. It is also a work in progress: the methodology gets
              revised, features get removed when they confuse more than they
              help, and some parts are held together by scripts I would not hand
              to a client without cleaning first.
            </p>
            <p>
              Saying that costs nothing. What the site claims to measure, it
              measures honestly, and that mattered more to me than shipping
              something that looked finished.
            </p>
          </section>

          <section className="about-me">
            <h2>Who</h2>
            <p>
              I&rsquo;m Edzrna — a graphic designer turned developer, working as
              a solo builder. That combination is why this site looks the way it
              does: the same person drew the character, wrote the normalization
              math, built the game and set up the deployment.
            </p>
            <p>
              Most of what you see here would be a team&rsquo;s worth of work in
              an agency: art direction, animation pipeline, data engineering,
              front end, back end, infrastructure. I&rsquo;m not saying that to
              impress anyone. I&rsquo;m saying it because if you need something
              built end to end by someone who can hold the whole thing in their
              head, that&rsquo;s the skill this site is evidence of.
            </p>

            <div className="about-actions">
              <a
                className="about-cta"
                href="mailto:contact@wojakmeter.com?subject=Project%20enquiry"
              >
                contact@wojakmeter.com
              </a>
              {/* Enlace secundario a propósito: quien llega aquí ya vio el
                  trabajo. El perfil de marketplace va al final, no de entrada. */}
              <a
                className="about-cta about-cta--ghost"
                href="https://www.upwork.com/freelancers/~YOUR_ID"
                target="_blank"
                rel="noreferrer noopener"
              >
                Freelance profile
              </a>
            </div>
          </section>

          <footer className="about-foot">
            <Link href="/">wojakmeter.com</Link>
            <span>·</span>
            <Link href="/terms">Terms</Link>
            <span>·</span>
            <Link href="/privacy">Privacy</Link>
            <span>·</span>
            <Link href="/disclaimer">Disclaimer</Link>
          </footer>
        </div>
      </main>
    </>
  );
}
