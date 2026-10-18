import type { EpisodeCreateInput } from "@/server/contracts";
import { generateDialogueDraft } from "@/server/agents/dialogue-orchestrator";
import { createEpisode, getEpisodeRecord, updateEpisodeRecord } from "@/server/repositories/episode-repository";

export function createEpisodeService(input: EpisodeCreateInput) {
  return createEpisode(input);
}

export function generateEpisodeService(id: string) {
  const current = getEpisodeRecord(id);
  if (!current) throw new Error("找不到对应一席");

  updateEpisodeRecord(id, { status: "generating", error: undefined });

  try {
    const draft = generateDialogueDraft({
      topicId: current.topicId,
      personIds: current.personIds,
      format: current.format,
      duration: current.duration as "约 3 分钟" | "约 4 分钟" | "约 5 分钟"
    });

    return updateEpisodeRecord(id, {
      ...draft,
      status: "published",
      error: undefined
    });
  } catch (error) {
    updateEpisodeRecord(id, {
      status: "failed",
      error: error instanceof Error ? error.message : "生成失败"
    });
    throw error;
  }
}
