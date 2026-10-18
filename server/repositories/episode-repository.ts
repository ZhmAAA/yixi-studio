import { episodes, getTopicById, type Episode } from "@/lib/content";
import type { EpisodeCreateInput } from "@/server/contracts";

export type EpisodeStatus = "pending" | "generating" | "published" | "failed";

export type EpisodeRecord = Episode & {
  status: EpisodeStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
};

const store = new Map<string, EpisodeRecord>(
  episodes.map((episode) => [
    episode.id,
    {
      ...episode,
      status: "published",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ])
);

export function createEpisode(input: EpisodeCreateInput): EpisodeRecord {
  const topic = getTopicById(input.topicId);
  if (!topic) throw new Error("找不到对应问题");

  const id = `episode-${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  const record: EpisodeRecord = {
    id,
    title: "正在整理这一席",
    question: topic.title,
    topicId: input.topicId,
    personIds: input.personIds,
    format: input.format,
    duration: input.duration,
    combinationType: "待生成",
    disclosure: "本内容基于公开资料的 AI 演绎，非本人发言，不代表本人观点。",
    turns: [],
    status: "pending",
    createdAt: now,
    updatedAt: now
  };
  store.set(id, record);
  return record;
}

export function getEpisodeRecord(id: string) {
  return store.get(id);
}

export function updateEpisodeRecord(id: string, patch: Partial<EpisodeRecord>) {
  const current = store.get(id);
  if (!current) return undefined;
  const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
  store.set(id, updated);
  return updated;
}
