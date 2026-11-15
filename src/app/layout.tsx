import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaRegister } from "./pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Athelier",
  title: "Athelier | Tu historia hecha presente",
  description: "Tu historia hecha presente, unica como tu.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Athelier",
    statusBarStyle: "default"
  },
  icons: {
    icon: [{ url: "/app-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }]
  },
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#edbfc0"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
