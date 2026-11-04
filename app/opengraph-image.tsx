import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "Abdul Rauf Azhar, Full-Stack & AI Developer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#f3f1ec",
          color: "#161512",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#e8461e", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800 }}>AR</div>
          <div style={{ fontSize: 28, color: "#67635b" }}>Rahim Yar Khan, Pakistan</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, color: "#e8461e", fontWeight: 700 }}>I&apos;m</div>
          <div style={{ fontSize: 124, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>Abdul Rauf Azhar</div>
          <div style={{ fontSize: 40, marginTop: 20, color: "#67635b" }}>Full-stack &amp; AI developer. Six live products.</div>
        </div>
        <div style={{ height: 8, width: 220, background: "#e8461e", borderRadius: 4 }} />
      </div>
    ),
    size,
  );
}
