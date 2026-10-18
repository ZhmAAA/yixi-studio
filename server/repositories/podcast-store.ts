import { PodcastDraftSchema, type PodcastDraft } from "@/server/podcast/contracts";

export const PODCAST_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS podcast_drafts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    form TEXT NOT NULL,
    status TEXT NOT NULL,
    package_json TEXT NOT NULL,
    script_json TEXT NOT NULL,
    audio_plan_json TEXT NOT NULL,
    srt TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS podcast_drafts_updated_idx ON podcast_drafts (updated_at)`
];

export interface PodcastDraftStore {
  get(id: string): Promise<PodcastDraft | undefined>;
  list(): Promise<PodcastDraft[]>;
  insert(draft: PodcastDraft): Promise<void>;
}

export type PodcastDraftRow = {
  id: string;
  title: string;
  form: string;
  status: string;
  package_json: string;
  script_json: string;
  audio_plan_json: string;
  srt: string;
  created_at: string;
  updated_at: string;
};

export function draftToParams(draft: PodcastDraft) {
  return [
    draft.id,
    draft.title,
    draft.form,
    draft.status,
    JSON.stringify(draft.package),
    JSON.stringify(draft.script),
    JSON.stringify(draft.audioPlan),
    draft.srt,
    draft.createdAt,
    draft.updatedAt
  ];
}

export function rowToDraft(row: PodcastDraftRow): PodcastDraft {
  let informationPackage: unknown;
  let script: unknown;
  let audioPlan: unknown;
  try {
    informationPackage = JSON.parse(row.package_json);
    script = JSON.parse(row.script_json);
    audioPlan = JSON.parse(row.audio_plan_json);
  } catch {
    throw new Error("播客草稿记录损坏");
  }

  return PodcastDraftSchema.parse({
    id: row.id,
    title: row.title,
    form: row.form,
    status: row.status,
    package: informationPackage,
    script,
    audioPlan,
    srt: row.srt,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}
