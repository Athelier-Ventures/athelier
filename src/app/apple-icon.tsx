import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#edbfc0", alignItems: "center", justifyContent: "center", color: "#975039", fontFamily: "Georgia, serif", fontSize: 145, fontWeight: 600, borderRadius: 36 }}>
      A
    </div>,
    size
  );
}
