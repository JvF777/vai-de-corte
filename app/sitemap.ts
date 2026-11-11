import type { MetadataRoute } from "next";
import { urlDoSite } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = urlDoSite();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/cadastro`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
