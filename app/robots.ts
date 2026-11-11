import type { MetadataRoute } from "next";
import { urlDoSite } from "@/lib/site";

// O Google pode ler a página inicial, o cadastro e os links das barbearias, mas não o painel.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/painel", "/auth"] },
    sitemap: `${urlDoSite()}/sitemap.xml`,
  };
}
