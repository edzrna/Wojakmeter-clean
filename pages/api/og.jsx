import { ImageResponse } from "@vercel/og";

export const config = {
  runtime: "edge"
};

function moodColor(mood) {
  const map = {
    Frustration: "#ff3b4d",
    Concern: "#ff6c79",
    Doubt: "#ff9da6",
    Neutral: "#ffffff",
    Optimism: "#a6ffc4",
    Content: "#7cffaa",
    Euphoria: "#4dff88"
  };
  return map[mood] || "#ffffff";
}

function styleLabel(style) {
  if (style === "3d") return "3D";
  if (style === "anime") return "Anime";
  if (style === "minimal") return "Minimal";
  return "Classic";
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);

  const mood = searchParams.get("mood") || "Neutral";
  const score = searchParams.get("score") || "50";
  const tf = searchParams.get("tf") || "1h";
  const rawChange = Number(searchParams.get("change") || "0");
  const change = Number.isFinite(rawChange) ? rawChange : 0;
  const volume = searchParams.get("volume") || "--";
  const driver = searchParams.get("driver") || "Market flow / price action";
  const coin = searchParams.get("coin") || "BTC";
  const style = searchParams.get("style") || "classic";

  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${proto}://${host}`;
  const heroSrc = `${baseUrl}/assets/hero/${style}/${String(mood).toLowerCase()}.png`;
  const accent = moodColor(mood);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at top center, rgba(102,184,255,.10), transparent 24%), radial-gradient(circle at 20%