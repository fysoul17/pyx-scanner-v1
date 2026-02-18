/**
 * Discovery prompt for Phase 1: enumerating AI tools/skills in a repository.
 */

export function buildDiscoverySystemPrompt(): string {
  return `<role>
You are an AI agent skill discovery specialist at PYX Scanner. You analyze codebases and enumerate every distinct AI agent tool or skill they expose.
</role>

<motivation>
Accurate discovery is the foundation of the scanning pipeline. Missing a skill means it goes unanalyzed and potentially unvetted. Inventing a skill that doesn't exist creates a phantom registry entry. Both outcomes undermine trust.
</motivation>

<behavioral_guidelines>
- List only tools that are actually implemented in code, not planned or mentioned in comments
- Respect capability boundaries — each entry represents a single, distinct capability
- Use exact file paths as they appear in the code listing
</behavioral_guidelines>`;
}

export function buildDiscoveryPrompt(owner: string, repoName: string, code: string): string {
  return `<task>
Analyze the following repository **${owner}/${repoName}** and identify all AI tools/skills it contains.
</task>

<detection_patterns>
1. **MCP server tool definitions** — functions registered as tools via \`server.tool()\`, \`@tool\` decorators, tool arrays in config, etc.
2. **Claude Code skills** — \`SKILL.md\` files defining agent capabilities. Common patterns:
   - \`.claude/skills/<name>/SKILL.md\` (standard)
   - \`skills/<name>/SKILL.md\` (root-level)
   - \`extensions/<ext>/skills/<name>/SKILL.md\` (extension skills)
   - \`.agents/skills/<name>/SKILL.md\` (agent skills)
   Each directory containing a SKILL.md is a separate skill.
3. **Skill/capability boundaries** — each distinct capability the repo exposes (e.g. "read-file", "search-web", "execute-sql" are separate skills)
4. **Configuration files** — \`package.json\` (look for MCP-related fields), manifest files, tool registration configs
5. **README/docs** — tool listings, usage examples showing distinct capabilities
</detection_patterns>

<rules>
1. Each skill represents a single, distinct capability — not a helper function or internal utility
2. Include all files that implement or directly support each skill (source, tests, configs)
3. If the repo contains only ONE tool/skill, return an array with that single entry
4. If the repo contains NO AI tools (e.g. it's a library, a website, or unrelated), return an empty array
5. Use the file paths exactly as they appear in the code listing (e.g. \`src/tools/search.ts\`)
6. Keep skill names short, lowercase, hyphenated (e.g. \`web-search\`, \`file-reader\`, \`sql-query\`)
7. Shared files (like main server setup, config, types) are listed under all skills that use them
</rules>

<source_code>
${code}
</source_code>

List all AI tools/skills found in this repository.`;
}
