import type { Episode } from "@/lib/content";

export type EpisodeStatus = "pending" | "generating" | "draft" | "review" | "published" | "failed";

export type EpisodeRecord = Episode & {
  status: EpisodeStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
};

export type EpisodeRow = {
  id: string;
  title: string;
  question: string;
  topic_id: string;
  person_ids: string;
  format: string;
  duration: string;
  combination_type: string;
  disclosure: string;
  turns: string;
  status: string;
  error: string | null;
  created_at: string;
  updated_at: string;
};
