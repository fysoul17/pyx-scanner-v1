/**
 * JSON schema for Claude's --json-schema flag.
 * Enforces structured output matching ScanResultPayload shape.
 */

export const scanResultSchema = {
  type: "object",
  properties: {
    trust_status: {
      type: "string",
      enum: ["verified", "caution", "failed"],
      description:
        "verified = safe (score 0.0-3.9), caution = broad permissions but not malicious (score 4.0-6.9), failed = malicious or critical threats (score 7.0-10.0)",
    },
    intent: {
      type: "string",
      enum: ["benign", "risky", "malicious"],
      description:
        "Classify the tool's intent BEFORE scoring. benign = does what it claims, risky = legitimate but broad permissions, malicious = deceptive or harmful behavior",
    },
    recommendation: {
      type: "string",
      enum: ["safe", "caution", "danger"],
      description:
        "safe = risk_score 0.0-3.9, caution = risk_score 4.0-6.9, danger = risk_score 7.0-10.0",
    },
    risk_score: {
      type: "number",
      minimum: 0,
      maximum: 10,
      description: "Overall risk score from 0 (safe) to 10 (critical threat). Use one decimal place for precision (e.g., 2.3, 5.7). Avoid round integers.",
    },
    summary: {
      type: "string",
      description:
        "1-3 sentence human-readable summary of the security assessment",
    },
    details: {
      type: "object",
      properties: {
        data_exfiltration: {
          type: "object",
          properties: {
            detected: { type: "boolean" },
            evidence: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["detected", "evidence"],
          additionalProperties: false,
        },
        destructive_commands: {
          type: "object",
          properties: {
            detected: { type: "boolean" },
            evidence: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["detected", "evidence"],
          additionalProperties: false,
        },
        secret_access: {
          type: "object",
          properties: {
            detected: { type: "boolean" },
            evidence: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["detected", "evidence"],
          additionalProperties: false,
        },
        obfuscation: {
          type: "object",
          properties: {
            detected: { type: "boolean" },
            evidence: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["detected", "evidence"],
          additionalProperties: false,
        },
        prompt_injection: {
          type: "object",
          properties: {
            detected: { type: "boolean" },
            evidence: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["detected", "evidence"],
          additionalProperties: false,
        },
        social_engineering: {
          type: "object",
          properties: {
            detected: { type: "boolean" },
            evidence: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["detected", "evidence"],
          additionalProperties: false,
        },
        excessive_permissions: {
          type: "object",
          properties: {
            detected: { type: "boolean" },
            evidence: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["detected", "evidence"],
          additionalProperties: false,
        },
      },
      required: [
        "data_exfiltration",
        "destructive_commands",
        "secret_access",
        "obfuscation",
        "prompt_injection",
        "social_engineering",
        "excessive_permissions",
      ],
      additionalProperties: false,
      description: "Per-category threat analysis with evidence",
    },
    skill_about: {
      type: "object",
      properties: {
        purpose: {
          type: "string",
          description:
            "1-2 sentence description of what this skill actually does, based on SKILL.md and source code",
        },
        capabilities: {
          type: "array",
          items: { type: "string" },
          description:
            "Specific things the skill can do (e.g. 'Read GitHub issues', 'Create pull requests')",
        },
        use_cases: {
          type: "array",
          items: { type: "string" },
          description:
            "Practical scenarios where this skill is useful",
        },
        permissions_required: {
          type: "array",
          items: { type: "string" },
          description:
            "What access the skill needs and why (e.g. 'Filesystem read — reads project files for context')",
        },
        security_notes: {
          type: "string",
          description:
            "Plain-language security considerations for users deciding whether to install this skill",
        },
      },
      required: [
        "purpose",
        "capabilities",
        "use_cases",
        "permissions_required",
        "security_notes",
      ],
      additionalProperties: false,
      description:
        "Factual summary of what the skill does, based on SKILL.md and source code — not the README",
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 100,
      description:
        "Confidence level (0-100) in the assessment. Higher = more certain. Lower if code is obfuscated, incomplete, or ambiguous.",
    },
    static_findings_assessment: {
      type: "string",
      description:
        "Contextual assessment of static rule findings — which are genuine concerns vs false positives given the skill's purpose. If no static findings were provided, state that no deterministic issues were flagged.",
    },
    category: {
      type: "string",
      enum: [
        "developer-tools",
        "version-control",
        "web-browser",
        "data-files",
        "cloud-infra",
        "communication",
        "search-research",
        "productivity",
        "other",
      ],
      description:
        "Functional category of this skill based on its primary purpose",
    },
  },
  required: [
    "trust_status",
    "intent",
    "recommendation",
    "risk_score",
    "summary",
    "details",
    "skill_about",
    "confidence",
    "static_findings_assessment",
    "category",
  ],
  additionalProperties: false,
};
