import type { CheckResponse, HistoryResponse, SkillsResponse, ScanJobResponse } from "./types.js";

const BASE_URL = process.env.PYX_API_URL || "https://scanner.pyxmate.com";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${res.statusText}${body ? ` — ${body}` : ""}`);
  }

  return res.json() as Promise<T>;
}

export function checkSkill(owner: string, name: string): Promise<CheckResponse> {
  return request<CheckResponse>(
    `/api/v1/check/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
  );
}

export function requestScan(owner: string, name: string, requestedBy?: string): Promise<ScanJobResponse> {
  return request<ScanJobResponse>("/api/v1/scan", {
    method: "POST",
    body: JSON.stringify({ owner, name, requested_by: requestedBy }),
  });
}

export function getHistory(owner: string, name: string): Promise<HistoryResponse> {
  return request<HistoryResponse>(
    `/api/v1/history/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
  );
}

export function listSkills(params?: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<SkillsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
  if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));

  const qs = searchParams.toString();
  return request<SkillsResponse>(`/api/v1/skills${qs ? `?${qs}` : ""}`);
}
