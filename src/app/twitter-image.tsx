import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Stay — Compare vacation rental listings with your crew";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #FAF6F1 0%, #F0EBE3 100%)",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "#E05A47",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "#E05A47",
            marginBottom: 32,
          }}
        >
          <span style={{ fontSize: 52, fontWeight: 700, color: "#fff" }}>S</span>
        </div>
        <span
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#2C2521",
            letterSpacing: "-0.02em",
          }}
        >
          Stay
        </span>
        <span
          style={{
            fontSize: 26,
            color: "#8A7E74",
            marginTop: 12,
            fontFamily: "sans-serif",
            fontWeight: 400,
          }}
        >
          Compare vacation rental listings with your crew
        </span>
      </div>
    ),
    { ...size }
  );
}
