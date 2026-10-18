import { randomBytes } from "node:crypto";
import { episodes, getTopicById } from "@/lib/content";
import { FIXED_DISCLOSURE } from "@/lib/disclaimer";
import type { EpisodeCreateInput } from "@/server/contracts";
import type { EpisodeStore } from "@/server/repositories/episode-store";
import type { EpisodeRecord } from "@/server/repositories/episode-types";

const SEED_TIMESTAMP = "2026-10-18T00:00:00.000Z";

const globalForStore = globalThis as unknown as {
  __yixiEpisodeStore?: Promise<EpisodeStore>;
};

function seedRecords(): EpisodeRecord[] {
  return episodes.map((episode) => ({
    ...episode,
    status: "published",
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  }));
}

async function openStore() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  let store: EpisodeStore;
  if (!databaseUrl) {
    const { openSqliteEpisodeStore } = await import("@/server/repositories/sqlite-episode-store");
    store = openSqliteEpisodeStore(process.env.EPISODE_DB_PATH);
  } else if (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://")) {
    const { openPostgresEpisodeStore } = await import("@/server/repositories/postgres-episode-store");
    store = await openPostgresEpisodeStore(databaseUrl);
  } else {
    throw new Error("DATABASE_URL 需以 postgres:// 或 postgresql:// 开头。留空则使用 SQLite 文件。");
  }

  for (const record of seedRecords()) {
    await store.insertIfAbsent(record);
  }
  return store;
}

function getStore() {
  if (!globalForStore.__yixiEpisodeStore) {
    globalForStore.__yixiEpisodeStore = openStore().catch((error) => {
      globalForStore.__yixiEpisodeStore = undefined;
      throw error;
    });
  }
  return globalForStore.__yixiEpisodeStore;
}

export async function createEpisode(input: EpisodeCreateInput) {
  const topic = getTopicById(input.topicId);
  if (!topic) throw new Error("找不到对应问题");

  const now = new Date().toISOString();
  const record: EpisodeRecord = {
    id: `episode-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`,
    title: "正在整理这一席",
    question: topic.title,
    topicId: input.topicId,
    personIds: input.personIds,
    format: input.format,
    duration: input.duration,
    combinationType: "待生成",
    disclosure: FIXED_DISCLOSURE,
    turns: [],
    status: "pending",
    createdAt: now,
    updatedAt: now
  };
  const store = await getStore();
  await store.insert(record);
  return record;
}

export async function getEpisodeRecord(id: string) {
  const store = await getStore();
  return store.get(id);
}

export async function listEpisodeRecords() {
  const store = await getStore();
  return store.list();
}

export async function listPublishedEpisodes() {
  const records = await listEpisodeRecords();
  return records.filter((record) => record.status === "published");
}

export async function updateEpisodeRecord(id: string, patch: Partial<EpisodeRecord>) {
  const store = await getStore();
  const current = await store.get(id);
  if (!current) return undefined;
  const updated: EpisodeRecord = {
    ...current,
    ...patch,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString()
  };
  await store.save(updated);
  return updated;
}

export type { EpisodeRecord, EpisodeStatus } from "@/server/repositories/episode-types";
