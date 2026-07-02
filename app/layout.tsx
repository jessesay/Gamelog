import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./brand.css";
import { getSiteUrl } from "@/lib/siteUrl";
import { Analytics } from "@vercel/analytics/next";
import FeedbackLauncher from "@/components/FeedbackLauncher";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "GameLog — Your gaming command center",
    template: "%s | GameLog"
  },
  description: "Track what you play. Review what you love. Discover what’s next. Build profile shelves, lists, and recommendations around your gaming taste.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/brand/gamelog-icon.png",
    apple: "/brand/gamelog-icon.png"
  },
  appleWebApp: {
    capable: true,
    title: "GameLog",
    statusBarStyle: "black-translucent"
  },
  openGraph: {
    title: "GameLog",
    description: "Track what you play. Review what you love. Discover what’s next. Join the early GameLog beta.",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "GameLog",
    description: "Track what you play. Review what you love. Discover what’s next."
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0b0e"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}<FeedbackLauncher /><Analytics /></body>
    </html>
  );
}
