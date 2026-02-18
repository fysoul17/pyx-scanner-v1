import { CORS_HEADERS, corsOptions } from "../../api/v1/_lib/cors";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://scanner.pyxmate.com";

export async function OPTIONS() {
  return corsOptions();
}

export async function GET() {
  const manifest = {
    schema_version: "v1",
    name_for_human: "PYX Scanner",
    name_for_model: "pyx_scanner",
    description_for_human:
      "Security scanner for AI skills. Check any AI skill's trust status before installing.",
    description_for_model:
      "PYX Scanner analyzes AI skills (MCP tools, ClawHub packages) for security threats including data exfiltration, credential theft, prompt injection, and more. Use this to check whether an AI skill is safe to install. Call the check endpoint with the skill owner and name to get a trust assessment with a safe/unsafe boolean, risk score, and detailed analysis.",
    auth: { type: "none" },
    api: {
      type: "openapi",
      url: `${BASE_URL}/api/v1/openapi.json`,
    },
    logo_url: `${BASE_URL}/favicon.ico`,
    contact_email: "support@pyxai.dev",
    legal_info_url: `${BASE_URL}/docs`,
  };

  return Response.json(manifest, {
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
