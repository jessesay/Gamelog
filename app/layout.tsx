import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GameLog — Track, rate, review, and discover games",
  description: "A mobile-first social game diary with swipe discovery, IGDB-powered catalog imports, and an AI backlog coach.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    apple: "/icon.svg"
  },
  appleWebApp: {
    capable: true,
    title: "GameLog",
    statusBarStyle: "black-translucent"
  },
  openGraph: {
    title: "GameLog",
    description: "Track what you play. Review what hits. Attack the backlog.",
    type: "website"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0b1020"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
