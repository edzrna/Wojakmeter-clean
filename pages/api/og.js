import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
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
          fontWeight: 800
        }}
      >
        WOJAKMETER OG TEST
      </div>
    ),
    {
      width: 1200,
      height: 630
    }
  );
}