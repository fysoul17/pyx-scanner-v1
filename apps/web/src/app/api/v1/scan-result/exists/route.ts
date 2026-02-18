import { NextResponse } from "next/server";
import { getAdminClient } from "@lib/supabase";
import { verifyAdminAuth } from "@lib/admin-auth";

export async function GET(request: Request) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const name = searchParams.get("name");
  const commitHash = searchParams.get("commit_hash");

  if (!owner || !name || !commitHash) {
    return NextResponse.json(
      { error: "Missing required params: owner, name, commit_hash" },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await getAdminClient()
      .from("scan_results")
      .select("id, skills!inner(owner, name)")
      .eq("skills.owner", owner)
      .eq("skills.name", name)
      .eq("commit_hash", commitHash)
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data) {
      return NextResponse.json({ exists: true, scan_id: data.id });
    }

    return NextResponse.json({ exists: false });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
