import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#edbfc0", alignItems: "center", justifyContent: "center", color: "#975039", fontFamily: "Georgia, serif", fontSize: 155, fontWeight: 600, borderRadius: 36 }}>
      A
    </div>,
    { width: 192, height: 192 }
  );
}
