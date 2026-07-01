import "server-only";

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
    || process.env.VERCEL_PROJECT_PRODUCTION_URL
    || process.env.VERCEL_URL
    || process.env.NEXT_PUBLIC_VERCEL_URL
    || (process.env.NODE_ENV === "production" ? "https://thegamelog.app" : "http://localhost:3000");
  const withProtocol = configured.startsWith("http://") || configured.startsWith("https://")
    ? configured
    : `https://${configured}`;
  return withProtocol.replace(/\/$/, "");
}
