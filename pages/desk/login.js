// ===============================
// WOJAKMETER — DESK LOGIN
// pages/desk/login.js
// ===============================

import Head from "next/head";
import { useState } from "react";
import { useRouter } from "next/router";

export default function DeskLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const expired = router.query.expired === "1";

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/desk/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (data.ok) {
        router.push("/desk");
      } else {
        setError(data.error || "Login failed");
        setPassword("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head>
        <title>Desk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="wrap">
        <form onSubmit={submit} className="box">
          <div className="logo">🧠</div>
          <h1>WojakMeter Desk</h1>
          <p className="sub">Private access</p>

          {expired && <div className="note">Session expired. Sign in again.</div>}

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            autoComplete="current-password"
          />

          {error && <div className="err">{error}</div>}

          <button type="submit" disabled={busy || !password}>
            {busy ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>

      <style jsx>{`
        .wrap {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 20px;
          background:
            radial-gradient(circle at 50% 30%, rgba(77,255,136,0.06), transparent 40%),
            linear-gradient(180deg, #071018 0%, #0b1622 100%);
          font-family: Inter, system-ui, sans-serif;
        }
        .box {
          width: min(380px, 100%);
          padding: 36px 28px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.08);
          background: linear-gradient(180deg, #132235 0%, #101c2b 100%);
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          display: flex;
          flex-direction: column;
          gap: 14px;
          text-align: center;
        }
        .logo { font-size: 2.4rem; }
        h1 {
          margin: 0;
          font-size: 1.3rem;
          color: #f5f7fb;
          letter-spacing: -0.02em;
        }
        .sub {
          margin: 0 0 6px;
          font-size: 0.78rem;
          color: #9eacbf;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }
        input {
          padding: 13px 15px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.3);
          color: #f5f7fb;
          font-size: 0.95rem;
          outline: none;
          text-align: center;
        }
        input:focus {
          border-color: rgba(77,255,136,0.4);
          box-shadow: 0 0 0 4px rgba(77,255,136,0.07);
        }
        button {
          padding: 13px;
          border-radius: 13px;
          border: 1px solid rgba(77,255,136,0.3);
          background: rgba(77,255,136,0.12);
          color: #dffff0;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: 0.2s;
        }
        button:hover:not(:disabled) { filter: brightness(1.2); }
        button:disabled { opacity: 0.4; cursor: not-allowed; }
        .err {
          padding: 9px;
          border-radius: 10px;
          font-size: 0.82rem;
          background: rgba(255,59,77,0.12);
          border: 1px solid rgba(255,59,77,0.3);
          color: #ff9da6;
        }
        .note {
          padding: 9px;
          border-radius: 10px;
          font-size: 0.82rem;
          background: rgba(255,157,166,0.1);
          color: #ff9da6;
        }
      `}</style>

      <style jsx global>{`body { margin: 0; }`}</style>
    </>
  );
}
