import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const routes = ["", "/app", "/features", "/catalog-builder", "/beta", "/join", "/start", "/feedback", "/updates", "/faq", "/changelog", "/status", "/about", "/roadmap", "/press", "/privacy", "/terms", "/launch"];
  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" || route === "/app" || route === "/changelog" || route === "/status" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/app" ? 0.95 : ["/features", "/catalog-builder", "/beta", "/join", "/start", "/feedback"].includes(route) ? 0.85 : 0.6
  }));
}
