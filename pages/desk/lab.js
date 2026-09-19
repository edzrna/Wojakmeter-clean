// ===============================
// WOJAKMETER — DESK LAB PAGE
// pages/desk/lab.js  →  /desk/lab
//
// The lattice and the Edge Lab side by side. Behind the same gate as
// the rest of /desk (middleware.js). Both panels fetch their own data
// through /api/desk/bot, so this page holds no state of its own.
// ===============================

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import HexLattice from "../../components/desk/HexLattice";
import EdgeLab from "../../components/desk/EdgeLab";

export default function DeskLab() {
  const router = useRouter();

  async function logout() {
    try {
      await fetch("/api/desk/auth", { method: "DELETE", credentials: "same-origin" });
    } finally {
      router.push("/desk/login");
    }
  }

  return (
    <main className="lab-page">
      <Head>
        <title>Lab · WojakMeter Desk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <header className="top">
        <div>
          <div className="eyebrow">WojakMeter desk</div>
          <h1>Research lab</h1>
        </div>
        <nav>
          <Link href="/desk">Desk</Link>
          <button type="button" onClick={logout}>
            Log out
          </button>
        </nav>
      </header>

      <div className="columns">
        <HexLattice />
        <EdgeLab />
      </div>

      <style jsx>{`
        .lab-page {
          min-height: 100vh;
          padding: 28px 18px 64px;
          background: #070a0e;
          color: #cfd7e3;
        }
        .top {
          max-width: 1180px;
          margin: 0 auto 18px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
          flex-wrap: wrap;
        }
        .eyebrow {
          font-size: 0.65rem;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #6b7785;
        }
        h1 {
          margin: 4px 0 0;
          font-size: 1.5rem;
          color: #f5f7fb;
        }
        nav {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        nav :global(a),
        nav button {
          padding: 7px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: #cfd7e3;
          font: inherit;
          font-size: 0.78rem;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
        }
        .columns {
          max-width: 1180px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
          gap: 18px;
          align-items: start;
        }
        .lab-page :global(.card) {
          padding: 18px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }
        @media (max-width: 900px) {
          .columns {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
