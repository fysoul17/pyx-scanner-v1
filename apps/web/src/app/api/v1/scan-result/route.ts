import { NextResponse } from "next/server";
import { getAdminClient } from "@lib/supabase";
import { verifyAdminAuth } from "@lib/admin-auth";
import type { ScanResultPayload } from "@shared/types";

export async function POST(request: Request) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ScanResultPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    owner,
    name,
    description,
    repo,
    commit_hash,
    version,
    trust_status,
    recommendation,
    risk_score,
    summary,
    details,
    skill_about,
    model,
    confidence,
    dependency_vulnerabilities,
    was_truncated,
    pre_scan_flags,
    source,
    clawhub_slug,
    clawhub_version,
    clawhub_content_hash,
    clawhub_downloads,
    clawhub_stars,
    clawhub_url,
    github_stars,
    github_forks,
    github_is_private,
    intent,
    category,
  } = body;

  if (!owner || !name || !commit_hash || !trust_status || !recommendation || risk_score == null || !summary) {
    return NextResponse.json(
      { error: "Missing required fields: owner, name, commit_hash, trust_status, recommendation, risk_score, summary" },
      { status: 400 }
    );
  }

  const validStatuses = ["verified", "caution", "failed", "unscanned"];
  const validRecommendations = ["safe", "caution", "danger", "unknown"];

  if (!validStatuses.includes(trust_status)) {
    return NextResponse.json(
      { error: `Invalid trust_status. Must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  if (!validRecommendations.includes(recommendation)) {
    return NextResponse.json(
      { error: `Invalid recommendation. Must be one of: ${validRecommendations.join(", ")}` },
      { status: 400 }
    );
  }

  if (typeof risk_score !== "number" || risk_score < 0 || risk_score > 10) {
    return NextResponse.json(
      { error: "risk_score must be a number between 0 and 10" },
      { status: 400 }
    );
  }

  if (confidence != null && (typeof confidence !== "number" || confidence < 0 || confidence > 100)) {
    return NextResponse.json(
      { error: "confidence must be a number between 0 and 100" },
      { status: 400 }
    );
  }

  const validSources = ["github", "clawhub"];
  if (source && !validSources.includes(source)) {
    return NextResponse.json(
      { error: `Invalid source. Must be one of: ${validSources.join(", ")}` },
      { status: 400 }
    );
  }

  const validIntents = ["benign", "risky", "malicious"];
  if (intent && !validIntents.includes(intent)) {
    return NextResponse.json(
      { error: `Invalid intent. Must be one of: ${validIntents.join(", ")}` },
      { status: 400 }
    );
  }

  const validCategories = [
    "developer-tools", "version-control", "web-browser", "data-files",
    "cloud-infra", "communication", "search-research", "productivity", "other",
  ];
  if (category && !validCategories.includes(category)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    // Upsert skill
    const isClawHub = source === "clawhub";
    const skillData: Record<string, unknown> = {
      owner,
      name,
      description: description || null,
      repo: repo || null,
      repository_url: isClawHub
        ? (clawhub_url || (clawhub_slug ? `https://clawhub.ai/skills/${clawhub_slug}` : null))
        : `https://github.com/${repo || `${owner}/${name}`}`,
      source: source || "github",
      updated_at: new Date().toISOString(),
    };

    if (isClawHub) {
      skillData.clawhub_slug = clawhub_slug || null;
      skillData.clawhub_version = clawhub_version || null;
      skillData.clawhub_content_hash = clawhub_content_hash || null;
      skillData.clawhub_downloads = clawhub_downloads ?? null;
      skillData.clawhub_stars = clawhub_stars ?? null;
      skillData.clawhub_url = clawhub_url || null;
    } else {
      skillData.github_stars = github_stars ?? null;
      skillData.github_forks = github_forks ?? null;
      skillData.github_is_private = github_is_private ?? null;
    }

    const { data: skill, error: skillError } = await getAdminClient()
      .from("skills")
      .upsert(skillData, { onConflict: "owner,name" })
      .select()
      .single();

    if (skillError) {
      return NextResponse.json({ error: skillError.message }, { status: 500 });
    }

    // Check for existing scan result (avoid duplicate insert error)
    const { data: existing } = await getAdminClient()
      .from("scan_results")
      .select("id, trust_status, risk_score, summary")
      .eq("skill_id", skill.id)
      .eq("commit_hash", commit_hash)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { already_exists: true, scan_result: existing },
        { status: 200 }
      );
    }

    // Insert scan result
    const { data: scanResult, error: scanError } = await getAdminClient()
      .from("scan_results")
      .insert({
        skill_id: skill.id,
        commit_hash,
        version: version || null,
        trust_status,
        recommendation,
        risk_score,
        summary,
        details: details || null,
        skill_about: skill_about || null,
        model: model || null,
        confidence: confidence ?? null,
        dependency_vulnerabilities: dependency_vulnerabilities ?? null,
        was_truncated: was_truncated ?? false,
        pre_scan_flags: pre_scan_flags ?? null,
        intent: intent || null,
        category: category || null,
      })
      .select()
      .single();

    if (scanError) {
      return NextResponse.json({ error: scanError.message }, { status: 500 });
    }

    // Update skill status and latest scan commit
    const updateData: Record<string, unknown> = {
      latest_scan_commit: commit_hash,
      status: trust_status,
      updated_at: new Date().toISOString(),
    };

    if (category) {
      updateData.category = category;
    }

    if (trust_status === "verified") {
      updateData.last_safe_commit = commit_hash;
      updateData.last_safe_version = version || null;
    }

    await getAdminClient().from("skills").update(updateData).eq("id", skill.id);

    return NextResponse.json(scanResult, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
