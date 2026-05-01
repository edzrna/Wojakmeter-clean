import { ImageResponse } from "@vercel/og";

export const config = {
  runtime: "edge",
};

export default function handler(req) {
  const url = new URL(req.url);

  const mood = url.searchParams.get("mood") || "Content";
  const score = url.searchParams.get("score") || "70";
  const tf = url.searchParams.get("tf") || "24h";
  const change = url.searchParams.get("change") || "+2.05";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background: "linear-gradient(180deg,#071018,#0b1622)",
          color: "white",
          fontFamily: "Arial",
          padding: "60px",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "34px",
            border: "1px solid rgba(255,255,255,.12)",
            background: "#101c2b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "60px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: "22px",
                letterSpacing: ".18em",
                color: "#9eacbf",
                marginBottom: "24px",
              }}
            >
              WOJAKMETER
            </div>

            <div
              style={{
                fontSize: "86px",
                fontWeight: 900,
                color: "#7cffaa",
                lineHeight: 1,
              }}
            >
              {mood}
            </div>

            <div
              style={{
                fontSize: "36px",
                marginTop: "22px",
                color: "#ffffff",
              }}
            >
              Score {score}/100 · {tf}
            </div>

            <div
              style={{
                fontSize: "28px",
                marginTop: "20px",
                color: "#cfd7e3",
              }}
            >
              Move: {change}%
            </div>

            <div
              style={{
                fontSize: "24px",
                marginTop: "36px",
                color: "#9eacbf",
              }}
            >
              wojakmeter.com
            </div>
          </div>

          <div
            style={{
              width: "340px",
              height: "340px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(124,255,170,.55), transparent 70%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "120px",
              fontWeight: 900,
              color: "#7cffaa",
            }}
          >
            {score}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}