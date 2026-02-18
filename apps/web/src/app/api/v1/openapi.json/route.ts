import { CORS_HEADERS, corsOptions } from "../_lib/cors";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://scanner.pyxmate.com";

export async function OPTIONS() {
  return corsOptions();
}

export async function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "PYX Scanner API",
      description:
        "The Trust Layer for AI — Security scanning API for AI skills. Check any AI skill's trust status before installing.",
      version: "1.0.0",
      contact: {
        name: "PYX Scanner",
        url: BASE_URL,
      },
    },
    servers: [{ url: BASE_URL, description: "Production" }],
    paths: {
      "/api/v1/check/{owner}/{name}": {
        get: {
          operationId: "checkSkill",
          summary: "Check an AI skill's trust status",
          description:
            "Returns the security assessment for a specific AI skill, including whether it is safe to install.",
          parameters: [
            {
              name: "owner",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Skill owner or organization",
              example: "anthropic",
            },
            {
              name: "name",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Skill name",
              example: "web-search",
            },
          ],
          responses: {
            "200": {
              description: "Skill found — returns trust assessment",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CheckResponse" },
                },
              },
            },
            "404": {
              description: "Skill has never been scanned",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "429": {
              description: "Rate limit exceeded (60 req/min)",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/v1/skills": {
        get: {
          operationId: "listSkills",
          summary: "List scanned AI skills",
          description:
            "Returns a paginated list of all scanned AI skills, with optional filtering by status or search term.",
          parameters: [
            {
              name: "search",
              in: "query",
              schema: { type: "string" },
              description: "Search owner, name, or description",
            },
            {
              name: "status",
              in: "query",
              schema: {
                type: "string",
                enum: [
                  "verified",
                  "caution",
                  "failed",
                  "unscanned",
                ],
              },
              description: "Filter by trust status",
            },
            {
              name: "category",
              in: "query",
              schema: {
                type: "string",
                enum: [
                  "developer-tools", "version-control", "web-browser", "data-files",
                  "cloud-infra", "communication", "search-research", "productivity", "other",
                ],
              },
              description: "Filter by functional category",
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20, maximum: 100 },
              description: "Results per page",
            },
            {
              name: "offset",
              in: "query",
              schema: { type: "integer", default: 0 },
              description: "Pagination offset",
            },
          ],
          responses: {
            "200": {
              description: "Paginated list of skills",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SkillsResponse" },
                },
              },
            },
            "429": {
              description: "Rate limit exceeded (30 req/min)",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/v1/badge/{owner}/{name}": {
        get: {
          operationId: "getSkillBadge",
          summary: "Get trust badge SVG",
          description:
            "Returns an SVG badge showing the skill's current trust status. Embed in READMEs.",
          parameters: [
            {
              name: "owner",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "name",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "SVG badge",
              content: {
                "image/svg+xml": {
                  schema: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        CheckResponse: {
          type: "object",
          properties: {
            safe: {
              type: "boolean",
              description:
                "Whether the skill is safe to install (verified + not outdated)",
            },
            status: {
              type: "string",
              enum: [
                "verified",
                "caution",
                "failed",
                "unscanned",
              ],
            },
            recommendation: {
              type: "string",
              enum: ["safe", "caution", "danger", "unknown"],
            },
            owner: { type: "string" },
            name: { type: "string" },
            risk_score: { type: ["number", "null"], description: "0-10, lower is safer" },
            trust_score: {
              type: ["number", "null"],
              description: "0-100, higher is safer",
            },
            confidence: { type: ["number", "null"], description: "0-100" },
            scanned_commit: { type: ["string", "null"] },
            latest_commit: { type: ["string", "null"] },
            is_outdated: { type: "boolean" },
            last_safe_commit: { type: ["string", "null"] },
            last_safe_version: { type: ["string", "null"] },
            intent: {
              type: ["string", "null"],
              enum: ["benign", "risky", "malicious"],
              description: "AI-classified intent: benign, risky, or malicious. Null for older scans.",
            },
            summary: { type: ["string", "null"] },
            about: {
              type: ["object", "null"],
              properties: {
                purpose: { type: "string" },
                capabilities: { type: "array", items: { type: "string" } },
                use_cases: { type: "array", items: { type: "string" } },
                permissions_required: {
                  type: "array",
                  items: { type: "string" },
                },
                security_notes: { type: "string" },
              },
            },
            category: {
              type: ["string", "null"],
              enum: [
                "developer-tools", "version-control", "web-browser", "data-files",
                "cloud-infra", "communication", "search-research", "productivity", "other",
              ],
              description: "Functional category of the skill",
            },
            scanned_at: { type: ["string", "null"], format: "date-time" },
            detail_url: { type: "string", format: "uri" },
            badge_url: { type: "string", format: "uri" },
            repository_url: { type: ["string", "null"], format: "uri" },
          },
        },
        SkillsResponse: {
          type: "object",
          properties: {
            skills: {
              type: "array",
              items: { $ref: "#/components/schemas/SkillSummary" },
            },
            total: { type: "integer" },
            limit: { type: "integer" },
            offset: { type: "integer" },
          },
        },
        SkillSummary: {
          type: "object",
          properties: {
            owner: { type: "string" },
            name: { type: "string" },
            status: {
              type: "string",
              enum: [
                "verified",
                "caution",
                "failed",
                "unscanned",
              ],
            },
            source: { type: "string", enum: ["github", "clawhub"] },
            category: {
              type: ["string", "null"],
              enum: [
                "developer-tools", "version-control", "web-browser", "data-files",
                "cloud-infra", "communication", "search-research", "productivity", "other",
              ],
              description: "Functional category of the skill",
            },
            description: { type: ["string", "null"] },
            detail_url: { type: "string", format: "uri" },
            badge_url: { type: "string", format: "uri" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
  };

  return Response.json(spec, {
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
