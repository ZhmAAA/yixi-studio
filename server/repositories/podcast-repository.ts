import type { PodcastDraft } from "@/server/podcast/contracts";
import type { PodcastDraftStore } from "@/server/repositories/podcast-store";

const globalForStore = globalThis as unknown as {
  __yixiPodcastStore?: Promise<PodcastDraftStore>;
};

async function openStore() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    const { openSqlitePodcastStore } = await import("@/server/repositories/sqlite-podcast-store");
    return openSqlitePodcastStore(process.env.PODCAST_DB_PATH || process.env.EPISODE_DB_PATH);
  }
  if (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://")) {
    const { openPostgresPodcastStore } = await import("@/server/repositories/postgres-podcast-store");
    return openPostgresPodcastStore(databaseUrl);
  }
  throw new Error("DATABASE_URL 需以 postgres:// 或 postgresql:// 开头。留空则使用 SQLite 文件。");
}

function getStore() {
  if (!globalForStore.__yixiPodcastStore) {
    globalForStore.__yixiPodcastStore = openStore().catch((error) => {
      globalForStore.__yixiPodcastStore = undefined;
      throw error;
    });
  }
  return globalForStore.__yixiPodcastStore;
}

export async function insertPodcastDraft(draft: PodcastDraft) {
  const store = await getStore();
  await store.insert(draft);
  return draft;
}

export async function getPodcastDraft(id: string) {
  const store = await getStore();
  return store.get(id);
}

export async function listPodcastDrafts() {
  const store = await getStore();
  return store.list();
}
