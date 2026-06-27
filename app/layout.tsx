import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/siteUrl";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "GameLog — Your gaming command center",
    template: "%s | GameLog"
  },
  description: "Track your library, decide what to play, watch prices, follow releases, build collections, and share your gaming taste. Now with a beta launch system, tester onboarding, feedback voting, feature pages, changelog, and status pages.",
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
    description: "Decide what to play. Track what you love. Watch prices. Share your taste. Join the GameLog beta and help shape the next build.",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "GameLog",
    description: "Your gaming command center."
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
