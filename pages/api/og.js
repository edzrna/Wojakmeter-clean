import { ImageResponse } from "@vercel/og";

export const config = {
  runtime: "edge",
};

export default function handler(req) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#071018",
          color: "#4dff88",
          fontSize: "80px",
          fontWeight: 800,
        }}
      >
        WOJAKMETER OG TEST
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}