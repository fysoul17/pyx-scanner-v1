import type { TrustStatus, SkillCategory } from "@shared/types";

export type { TrustStatus };

export interface BentoCardData {
  name: string;
  owner: string;
  description: string;
  status: TrustStatus;
  category: SkillCategory | null;
  score: number | null;
  stars: number | null;
  downloads: number | null;
  featured?: boolean;
  label?: string;
}

export interface FailedRowData {
  name: string;
  reason: string;
  tag: string;
  score: number;
  stars: number | null;
  downloads: number | null;
}

export interface CautionRowData {
  name: string;
  reason: string;
  tag: string;
  score: number;
  stars: number | null;
  downloads: number | null;
}

export interface PopularRowData {
  rank: number;
  name: string;
  owner: string;
  description: string | null;
  status: TrustStatus;
  category: SkillCategory | null;
  score: number | null;
  stars: number | null;
  downloads: number | null;
}

export interface MarqueeItem {
  value: string;
  label: string;
}
