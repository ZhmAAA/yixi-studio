import type { EpisodeCreateInput } from "@/server/contracts";
import { generateDialogueDraft } from "@/server/agents/dialogue-orchestrator";
import { createEpisode, getEpisodeRecord, updateEpisodeRecord } from "@/server/repositories/episode-repository";

export async function createEpisodeService(input: EpisodeCreateInput) {
  return createEpisode(input);
}

export async function generateEpisodeService(id: string) {
  const current = await getEpisodeRecord(id);
  if (!current) throw new Error("找不到对应一席");

  await updateEpisodeRecord(id, { status: "generating", error: undefined });

  try {
    const draft = generateDialogueDraft({
      topicId: current.topicId,
      personIds: current.personIds,
      format: current.format,
      duration: current.duration as "约 3 分钟" | "约 4 分钟" | "约 5 分钟"
    });

    return await updateEpisodeRecord(id, {
      ...draft,
      status: "draft",
      error: undefined
    });
  } catch (error) {
    await updateEpisodeRecord(id, {
      status: "failed",
      error: error instanceof Error ? error.message : "生成失败"
    });
    throw error;
  }
}
