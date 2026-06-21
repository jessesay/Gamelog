import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GameLog — Track, rate, and review games",
  description: "A Letterboxd-style social game diary for logging, rating, reviewing, and discovering video games.",
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
