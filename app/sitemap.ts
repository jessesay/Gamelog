import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gamelog.app";
  const routes = ["", "/app", "/features", "/beta", "/join", "/start", "/feedback", "/updates", "/faq", "/changelog", "/status", "/about", "/roadmap", "/press", "/privacy", "/terms", "/launch"];
  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" || route === "/app" || route === "/changelog" || route === "/status" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/app" ? 0.95 : ["/features", "/beta", "/join", "/start", "/feedback"].includes(route) ? 0.85 : 0.6
  }));
}
