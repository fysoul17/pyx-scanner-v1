"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { listSkillsAction } from "@lib/actions/skills";
import { StatusDot, labels as statusLabels } from "@/components/landing/status-dot";
import { RelativeTime } from "@/components/skill/relative-time";
import type { Skill, TrustStatus, SkillCategory, SkillsResponse } from "@shared/types";
import type { SkillSort } from "@lib/queries";

/** Convert risk_score (0-10, lower=safer) to trust score (0-100, higher=safer) */
function toTrustScore(riskScore: number | null | undefined): number | null {
  if (riskScore == null) return null;
  return Math.round((10 - riskScore) * 10);
}

/** Compact format: 847, 2.3K, 1.2M */
function formatCompact(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 999_950) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

const scoreColors: Record<TrustStatus, string> = {
  verified: "text-cv-verified",
  caution: "text-cv-warning",
  failed: "text-cv-failed",
  unscanned: "text-cv-text-muted",
};

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

const STATUSES: TrustStatus[] = ["verified", "caution", "failed"];

const SORTS: { value: SkillSort; label: string }[] = [
  { value: "updated", label: "Recently Updated" },
  { value: "popular", label: "Most Popular" },
];

const CATEGORIES: { value: SkillCategory; label: string }[] = [
  { value: "developer-tools", label: "Developer Tools" },
  { value: "version-control", label: "Version Control" },
  { value: "web-browser", label: "Web Browser" },
  { value: "data-files", label: "Data & Files" },
  { value: "cloud-infra", label: "Cloud & Infra" },
  { value: "communication", label: "Communication" },
  { value: "search-research", label: "Search & Research" },
  { value: "productivity", label: "Productivity" },
  { value: "other", label: "Other" },
];

function CategoryBadge({ category }: { category: SkillCategory | null }) {
  if (!category) return null;
  const label = CATEGORIES.find((c) => c.value === category)?.label ?? category;
  return (
    <span className="inline-block rounded-[2px] bg-cv-accent/8 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-cv-accent">
      {label}
    </span>
  );
}

function SkillRow({ skill }: { skill: Skill }) {
  const trustScore = toTrustScore(skill.risk_score ?? null);
  const stars = skill.github_stars ?? skill.clawhub_stars;
  const downloads = skill.clawhub_downloads;
  const hasMetrics = (stars != null && stars > 0) || (downloads != null && downloads > 0);

  return (
    <Link
      href={`/s/${skill.owner}/${skill.name}`}
      className="skill-row-hover grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-black/6 px-4 py-4 md:grid-cols-[1fr_100px_80px_140px_140px] hover:bg-black/[0.02] transition-colors"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-display text-[13px] font-bold tracking-[-0.01em]">
            {skill.owner}/{skill.name}
          </span>
          <CategoryBadge category={skill.category} />
        </div>
        {skill.description && (
          <p className="mt-0.5 truncate text-[11px] text-cv-text-muted font-light">
            {skill.description}
          </p>
        )}
      </div>
      <div className="hidden md:flex items-center gap-2 font-mono text-[11px] text-cv-text-muted">
        {hasMetrics ? (
          <>
            {stars != null && stars > 0 && (
              <span>
                <span aria-hidden="true">&#9733;</span>
                <span className="sr-only">Stars:</span> {formatCompact(stars)}
              </span>
            )}
            {downloads != null && downloads > 0 && (
              <span>
                <span aria-hidden="true">&darr;</span>
                <span className="sr-only">Downloads:</span> {formatCompact(downloads)}
              </span>
            )}
          </>
        ) : null}
      </div>
      <div className="hidden md:block">
        {trustScore != null ? (
          <span className={`text-[13px] font-bold tabular-nums ${scoreColors[skill.status]}`}>
            {trustScore}
          </span>
        ) : (
          <span className="text-[11px] text-cv-text-muted font-light">—</span>
        )}
      </div>
      <div className="hidden md:block">
        <StatusDot status={skill.status} />
      </div>
      <div className="text-right md:text-left">
        <span className="md:hidden mr-2">
          <StatusDot status={skill.status} />
        </span>
        <RelativeTime
          date={skill.updated_at}
          className="text-[11px] text-cv-text-muted font-light"
        />
      </div>
    </Link>
  );
}

export function SkillBrowser({ initial }: { initial: SkillsResponse }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [data, setData] = useState(initial);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState<TrustStatus | null>(
    (searchParams.get("status") as TrustStatus) || null
  );
  const [category, setCategory] = useState<SkillCategory | null>(
    (searchParams.get("category") as SkillCategory) || null
  );
  const [sort, setSort] = useState<SkillSort>(
    (searchParams.get("sort") as SkillSort) || "updated"
  );
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  const fetchSkills = useCallback(
    (s: string, st: TrustStatus | null, cat: SkillCategory | null, so: SkillSort, p: number) => {
      startTransition(async () => {
        const result = await listSkillsAction({
          search: s || null,
          status: st,
          category: cat,
          sort: so,
          limit: PAGE_SIZE,
          offset: (p - 1) * PAGE_SIZE,
        });
        setData(result);
      });
    },
    []
  );

  const updateUrl = useCallback(
    (s: string, st: TrustStatus | null, cat: SkillCategory | null, so: SkillSort, p: number) => {
      const params = new URLSearchParams();
      if (s) params.set("search", s);
      if (st) params.set("status", st);
      if (cat) params.set("category", cat);
      if (so !== "updated") params.set("sort", so);
      if (p > 1) params.set("page", String(p));
      const qs = params.toString();
      router.replace(`/browse${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router]
  );

  // Debounced search
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSkills(value, status, category, sort, 1);
      updateUrl(value, status, category, sort, 1);
    }, DEBOUNCE_MS);
  };

  const handleStatus = (st: TrustStatus | null) => {
    setStatus(st);
    setPage(1);
    fetchSkills(search, st, category, sort, 1);
    updateUrl(search, st, category, sort, 1);
  };

  const handleCategory = (cat: SkillCategory | null) => {
    setCategory(cat);
    setPage(1);
    fetchSkills(search, status, cat, sort, 1);
    updateUrl(search, status, cat, sort, 1);
  };

  const handleSort = (so: SkillSort) => {
    setSort(so);
    setPage(1);
    fetchSkills(search, status, category, so, 1);
    updateUrl(search, status, category, so, 1);
  };

  const handlePage = (p: number) => {
    setPage(p);
    fetchSkills(search, status, category, sort, p);
    updateUrl(search, status, category, sort, p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className={isPending ? "opacity-60 transition-opacity" : ""}>
      {/* Search + Filters */}
      <div className="mb-8 space-y-4">
        <label htmlFor="skill-search" className="sr-only">
          Search skills
        </label>
        <input
          id="skill-search"
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search skills by name, owner, or description…"
          className="w-full rounded-[4px] border border-black/10 bg-transparent px-4 py-3 text-[13px] font-light text-cv-text placeholder:text-cv-text-muted/60 outline-none transition-colors focus:border-cv-accent"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleStatus(null)}
            aria-pressed={status === null}
            className={`rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] transition-colors cursor-pointer ${
              status === null
                ? "bg-cv-accent text-white"
                : "bg-black/5 text-cv-text-muted hover:bg-black/10"
            }`}
          >
            All
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleStatus(status === s ? null : s)}
              aria-pressed={status === s}
              className={`rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] transition-colors cursor-pointer ${
                status === s
                  ? "bg-cv-accent text-white"
                  : "bg-black/5 text-cv-text-muted hover:bg-black/10"
              }`}
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCategory(null)}
            aria-pressed={category === null}
            className={`rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] transition-colors cursor-pointer ${
              category === null
                ? "bg-cv-accent text-white"
                : "bg-black/5 text-cv-text-muted hover:bg-black/10"
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => handleCategory(category === c.value ? null : c.value)}
              aria-pressed={category === c.value}
              className={`rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] transition-colors cursor-pointer ${
                category === c.value
                  ? "bg-cv-accent text-white"
                  : "bg-black/5 text-cv-text-muted hover:bg-black/10"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="mb-4 flex items-center gap-2" role="group" aria-label="Sort order">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-cv-text-muted mr-1" aria-hidden="true">
          Sort
        </span>
        {SORTS.map((s) => (
          <button
            key={s.value}
            onClick={() => handleSort(s.value)}
            aria-pressed={sort === s.value}
            className={`rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] transition-colors cursor-pointer ${
              sort === s.value
                ? "bg-cv-accent text-white"
                : "bg-black/5 text-cv-text-muted hover:bg-black/10"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Results header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] text-cv-text-muted font-light">
          {data.total} skill{data.total !== 1 ? "s" : ""} found
        </p>
        {totalPages > 1 && (
          <p className="text-[11px] text-cv-text-muted font-light">
            Page {page} of {totalPages}
          </p>
        )}
      </div>

      {/* Skill list */}
      {data.skills.length > 0 ? (
        <div className="rounded-[6px] border border-black/6 overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_100px_80px_140px_140px] gap-4 border-b border-black/10 px-4 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-cv-text-muted">
              Skill
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-cv-text-muted">
              Popularity
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-cv-text-muted">
              Score
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-cv-text-muted">
              Status
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-cv-text-muted">
              Updated
            </span>
          </div>
          {data.skills.map((skill) => (
            <SkillRow key={skill.id} skill={skill} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <p className="font-display text-lg font-bold tracking-[-0.01em] mb-2">
            No skills found
          </p>
          <p className="text-[12px] text-cv-text-muted font-light">
            Try adjusting your search or filters.
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => handlePage(page - 1)}
            disabled={page <= 1}
            className="rounded-[4px] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.06em] text-cv-text-muted transition-colors hover:text-cv-text disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            &larr; Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (p) =>
                p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)
            )
            .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("ellipsis");
              acc.push(p);
              return acc;
            }, [])
            .map((item, i) =>
              item === "ellipsis" ? (
                <span
                  key={`e${i}`}
                  className="px-1 text-[11px] text-cv-text-muted"
                >
                  &hellip;
                </span>
              ) : (
                <button
                  key={item}
                  onClick={() => handlePage(item)}
                  aria-current={page === item ? "page" : undefined}
                  className={`min-w-[32px] rounded-[4px] px-2 py-2 text-[11px] font-bold tracking-[0.06em] transition-colors cursor-pointer ${
                    page === item
                      ? "bg-cv-accent text-white"
                      : "text-cv-text-muted hover:text-cv-text hover:bg-black/5"
                  }`}
                >
                  {item}
                </button>
              )
            )}
          <button
            onClick={() => handlePage(page + 1)}
            disabled={page >= totalPages}
            className="rounded-[4px] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.06em] text-cv-text-muted transition-colors hover:text-cv-text disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
