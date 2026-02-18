/**
 * JSON schema for Claude's --json-schema flag during Phase 1 (Discovery).
 * Enforces structured output listing all AI tools/skills found in a repo.
 */

export interface DiscoveredSkill {
  skill_name: string;
  description: string;
  relevant_files: string[];
}

export interface DiscoveryOutput {
  skills: DiscoveredSkill[];
}

export const discoverySchema = {
  type: "object",
  properties: {
    skills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          skill_name: {
            type: "string",
            description:
              "A short, descriptive name for this AI tool/skill (e.g. 'web-search', 'file-reader')",
          },
          description: {
            type: "string",
            description:
              "One sentence describing what this tool/skill does",
          },
          relevant_files: {
            type: "array",
            items: { type: "string" },
            description:
              "File paths in the repo that implement or configure this skill",
          },
        },
        required: ["skill_name", "description", "relevant_files"],
        additionalProperties: false,
      },
      description:
        "List of AI tools/skills discovered in the repository. Empty array if none found.",
    },
  },
  required: ["skills"],
  additionalProperties: false,
};
