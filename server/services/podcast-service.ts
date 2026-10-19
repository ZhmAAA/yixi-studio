import { randomBytes } from "node:crypto";
import { runOrchestration } from "@/server/agents/interview-orchestrator";
import {
  InterviewRunInputSchema,
  PodcastDraftSchema,
  type PodcastDraft
} from "@/server/podcast/contracts";
import { createSpeechPipeline } from "@/server/podcast/speech";
import { structureFeed } from "@/server/podcast/structure-feed";
import { insertPodcastDraft } from "@/server/repositories/podcast-repository";

export async function createInterviewDraft(raw: unknown): Promise<PodcastDraft> {
  const input = InterviewRunInputSchema.parse(raw);
  const draftId = `podcast-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
  const informationPackage = structureFeed(input.feedText, {
    id: `pkg-${draftId}`,
    title: input.title?.trim() || undefined,
    collectedBy: input.collectedBy
  });
  const hostName = input.hostName?.trim();
  const script = runOrchestration({
    form: "interview",
    packageId: informationPackage.id,
    package: informationPackage,
    constraints: {
      ...(hostName ? { hostName } : {}),
      ...(input.guestNames?.length ? { guestNames: input.guestNames } : {})
    }
  }, { scriptId: draftId });

  const pipeline = createSpeechPipeline();
  const audioPlan = await pipeline.plan(script);
  const srt = pipeline.subtitles.toSrt(pipeline.cues(script, audioPlan));
  const now = new Date().toISOString();
  const draft = PodcastDraftSchema.parse({
    id: draftId,
    title: script.title,
    form: "interview",
    status: "draft",
    package: informationPackage,
    script,
    audioPlan,
    srt,
    createdAt: now,
    updatedAt: now
  });
  await insertPodcastDraft(draft);
  return draft;
}
