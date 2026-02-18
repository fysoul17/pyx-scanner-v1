import { NextResponse } from "next/server";
import { getAdminClient } from "@lib/supabase";
import { verifyAdminAuth } from "@lib/admin-auth";
import type { ScanRequest, ScanJobResponse, JobStatus } from "@shared/types";

export async function POST(request: Request) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ScanRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { owner, name, repo, requested_by } = body;

  if (!owner || !name) {
    return NextResponse.json(
      { error: "Missing required fields: owner, name" },
      { status: 400 }
    );
  }

  try {
    // Upsert skill
    const { data: skill, error: skillError } = await getAdminClient()
      .from("skills")
      .upsert(
        {
          owner,
          name,
          repo: repo || null,
          repository_url: `https://github.com/${repo || `${owner}/${name}`}`,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner,name" }
      )
      .select()
      .single();

    if (skillError) {
      return NextResponse.json({ error: skillError.message }, { status: 500 });
    }

    // Check for existing queued or running job (avoid duplicates)
    const { data: existingJob } = await getAdminClient()
      .from("scan_jobs")
      .select("id, status")
      .eq("skill_id", skill.id)
      .in("status", ["queued", "running"])
      .limit(1)
      .maybeSingle();

    if (existingJob) {
      const response: ScanJobResponse = {
        job_id: existingJob.id,
        status: existingJob.status as JobStatus,
        message: `Scan already ${existingJob.status} for ${owner}/${name}`,
      };
      return NextResponse.json(response, { status: 200 });
    }

    // Create scan job
    const { data: job, error: jobError } = await getAdminClient()
      .from("scan_jobs")
      .insert({
        skill_id: skill.id,
        requested_by: requested_by || null,
        status: "queued",
      })
      .select()
      .single();

    if (jobError) {
      return NextResponse.json({ error: jobError.message }, { status: 500 });
    }

    const response: ScanJobResponse = {
      job_id: job.id,
      status: "queued",
      message: `Scan queued for ${owner}/${name}`,
    };

    return NextResponse.json(response, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
