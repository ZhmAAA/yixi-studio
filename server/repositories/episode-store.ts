import type { Turn } from "@/lib/content";
import type { EpisodeRecord, EpisodeRow, EpisodeStatus } from "@/server/repositories/episode-types";

const STATUSES: EpisodeStatus[] = ["pending", "generating", "draft", "review", "published", "failed"];

export const EPISODE_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS episodes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    question TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    person_ids TEXT NOT NULL,
    format TEXT NOT NULL,
    duration TEXT NOT NULL,
    combination_type TEXT NOT NULL,
    disclosure TEXT NOT NULL,
    turns TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS episodes_status_updated_idx ON episodes (status, updated_at)`
];

export interface EpisodeStore {
  get(id: string): Promise<EpisodeRecord | undefined>;
  list(): Promise<EpisodeRecord[]>;
  insert(record: EpisodeRecord): Promise<void>;
  insertIfAbsent(record: EpisodeRecord): Promise<void>;
  save(record: EpisodeRecord): Promise<void>;
}

export function recordToParams(record: EpisodeRecord) {
  return [
    record.id,
    record.title,
    record.question,
    record.topicId,
    JSON.stringify(record.personIds),
    record.format,
    record.duration,
    record.combinationType,
    record.disclosure,
    JSON.stringify(record.turns),
    record.status,
    record.error ?? null,
    record.createdAt,
    record.updatedAt
  ];
}

export function rowToRecord(row: EpisodeRow): EpisodeRecord {
  if (!STATUSES.includes(row.status as EpisodeStatus)) {
    throw new Error(`未知的一席状态：${row.status}`);
  }
  const personIds = JSON.parse(row.person_ids) as unknown;
  const turns = JSON.parse(row.turns) as unknown;
  if (!Array.isArray(personIds) || !Array.isArray(turns)) {
    throw new Error("一席记录损坏");
  }

  return {
    id: row.id,
    title: row.title,
    question: row.question,
    topicId: row.topic_id,
    personIds: personIds as string[],
    format: "观点对谈",
    duration: row.duration,
    combinationType: row.combination_type,
    disclosure: row.disclosure,
    turns: turns as Turn[],
    status: row.status as EpisodeStatus,
    error: row.error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
