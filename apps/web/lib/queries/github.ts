/**
 * Fetch the latest commit SHA for a GitHub repository.
 * Non-fatal: returns null on any failure.
 */
export async function fetchLatestCommit(
  owner: string,
  name: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${name}/commits?per_page=1`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
        next: { revalidate: 60 },
      }
    );
    if (res.ok) {
      const commits = await res.json();
      if (Array.isArray(commits) && commits.length > 0) {
        return commits[0].sha;
      }
    }
  } catch {
    // GitHub API failure is non-fatal
  }
  return null;
}
