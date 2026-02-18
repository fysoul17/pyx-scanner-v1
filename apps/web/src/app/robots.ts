import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://scanner.pyxmate.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/v1/scan", "/api/v1/scan-result"],
      },
      {
        userAgent: ["GPTBot", "Claude-Web", "PerplexityBot", "Applebot-Extended"],
        allow: "/",
        disallow: ["/api/v1/scan", "/api/v1/scan-result"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
