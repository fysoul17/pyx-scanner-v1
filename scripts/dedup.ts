/**
 * Deduplication helper — checks if a skill+commit has already been scanned.
 *
 * Reads env vars lazily (at call time) so that .env loading in the importing
 * script has already completed by the time we access them.
 */

/**
 * Checks the PYX API to see if a scan result already exists for the given
 * owner/skill/commit combination.
 *
 * @returns true if already scanned, false otherwise (also false on network errors)
 */
export async function checkAlreadyScanned(
  owner: string,
  skillName: string,
  commitHash: string
): Promise<boolean> {
  const apiUrl = process.env.PYX_API_URL ?? "https://scanner.pyxmate.com";
  const adminKey = process.env.PYX_ADMIN_API_KEY;

  if (!adminKey) return false;

  try {
    const params = new URLSearchParams({
      owner,
      name: skillName,
      commit_hash: commitHash,
    });

    const res = await fetch(
      `${apiUrl}/api/v1/scan-result/exists?${params}`,
      {
        headers: { Authorization: `Bearer ${adminKey}` },
      }
    );

    if (!res.ok) return false;

    const data = (await res.json()) as { exists: boolean };
    return data.exists;
  } catch {
    // Network error — don't block the scan
    return false;
  }
}
