import type { MetadataRoute } from "next";
import { getAdminClient } from "@lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://scanner.pyxmate.com";

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/browse`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  let skillEntries: MetadataRoute.Sitemap = [];

  try {
    const { data } = await getAdminClient()
      .from("skills")
      .select("owner, name, updated_at")
      .neq("status", "unscanned")
      .order("updated_at", { ascending: false });

    if (data) {
      skillEntries = data.map((skill) => ({
        url: `${baseUrl}/s/${skill.owner}/${skill.name}`,
        lastModified: new Date(skill.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    }
  } catch {
    // Graceful degradation — return static entries only
  }

  return [...staticEntries, ...skillEntries];
}
