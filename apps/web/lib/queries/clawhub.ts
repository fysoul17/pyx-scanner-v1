/**
 * Fetch the latest version info for a ClawHub skill.
 * Non-fatal: returns null on any failure.
 */
export async function fetchLatestClawHubVersion(
  slug: string
): Promise<{ version: string; content_hash: string } | null> {
  try {
    const res = await fetch(
      `https://clawhub.ai/api/v1/skills/${encodeURIComponent(slug)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "pyx-scanner/1.0",
        },
        next: { revalidate: 60 },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.latest_version) {
        return {
          version: data.latest_version,
          content_hash: data.content_hash || "",
        };
      }
    }
  } catch {
    // ClawHub API failure is non-fatal
  }
  return null;
}
