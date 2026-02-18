import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { SkillBrowser } from "@/components/browse/skill-browser";
import { JsonLd } from "@/components/json-ld";
import { listSkills, VALID_STATUSES, VALID_CATEGORIES } from "@lib/queries";
import type { SkillSort } from "@lib/queries";
import type { TrustStatus, SkillCategory, SkillsResponse } from "@shared/types";

const VALID_SORTS: SkillSort[] = ["updated", "popular"];

const PAGE_SIZE = 20;

export const metadata = {
  title: "Browse Skills",
  description:
    "Search and explore all scanned AI skills. Filter by trust status. Every skill analyzed for 7 threat categories including prompt injection and social engineering.",
  alternates: { canonical: "/browse" },
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const search = typeof params.search === "string" ? params.search : null;
  const rawStatus = typeof params.status === "string" ? params.status : null;
  const status =
    rawStatus && VALID_STATUSES.includes(rawStatus as TrustStatus)
      ? (rawStatus as TrustStatus)
      : null;
  const rawCategory = typeof params.category === "string" ? params.category : null;
  const category =
    rawCategory && VALID_CATEGORIES.includes(rawCategory as SkillCategory)
      ? (rawCategory as SkillCategory)
      : null;
  const rawSort = typeof params.sort === "string" ? params.sort : null;
  const sort: SkillSort =
    rawSort && VALID_SORTS.includes(rawSort as SkillSort)
      ? (rawSort as SkillSort)
      : "updated";
  const page = Math.max(1, Number(params.page) || 1);

  let data: SkillsResponse = { skills: [], total: 0 };

  try {
    data = await listSkills({
      search,
      status,
      category,
      sort,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
  } catch {
    // Graceful degradation — render page with empty data
  }

  const browseJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Browse AI Skills",
    description:
      "Search and explore all scanned AI skills. Filter by trust status.",
    url: "https://scanner.pyxmate.com/browse",
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://scanner.pyxmate.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Browse Skills",
        item: "https://scanner.pyxmate.com/browse",
      },
    ],
  };

  return (
    <>
      <JsonLd data={browseJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <Nav />
      <main className="reveal r2 mx-auto max-w-[1200px] px-5 py-12 md:px-10">
        <header className="mb-10">
          <h1 className="font-display text-[40px] font-black tracking-[-0.02em] mb-2">
            Browse Skills
          </h1>
          <p className="text-[13px] text-cv-text-muted font-light">
            Search and filter all scanned AI skills.
          </p>
        </header>
        <SkillBrowser initial={data} />
      </main>
      <Footer />
    </>
  );
}
