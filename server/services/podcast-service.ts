import { randomBytes } from "node:crypto";
import { runPodcastOrchestration } from "@/server/agents/podcast-orchestrator";
import { generatePodcastWithModel, type PodcastModelResult } from "@/server/agents/podcast-model";
import type { DialogueScript, InformationPackage } from "@/server/podcast/contracts";
import {
  PodcastRunInputSchema,
  PodcastDraftSchema,
  type PodcastDraft
} from "@/server/podcast/contracts";
import { createSpeechPipeline } from "@/server/podcast/speech";
import { structureFeed } from "@/server/podcast/structure-feed";
import { insertPodcastDraft } from "@/server/repositories/podcast-repository";

type DraftOptions = {
  signal?: AbortSignal;
  generateModel?: (informationPackage: InformationPackage, baseline: DialogueScript, options: { signal?: AbortSignal }) => Promise<PodcastModelResult>;
};

export async function createPodcastDraft(raw: unknown, options: DraftOptions = {}): Promise<PodcastDraft> {
  const input = PodcastRunInputSchema.parse(raw);
  const draftId = `podcast-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
  const informationPackage = structureFeed(input.feedText, {
    id: `pkg-${draftId}`,
    title: input.title?.trim() || undefined,
    collectedBy: input.collectedBy
  });
  const hostName = input.hostName?.trim();
  const baseline = runPodcastOrchestration({
    form: input.form,
    packageId: informationPackage.id,
    package: informationPackage,
    constraints: {
      ...(hostName ? { hostName } : {}),
      ...(input.guestNames?.length ? { guestNames: input.guestNames } : {}),
      ...(input.targetTurns ? { targetTurns: input.targetTurns } : {}),
      ...(input.tone ? { tone: input.tone } : {})
    }
  }, { scriptId: draftId });

  const generated = input.generationMode === "model"
    ? await (options.generateModel ?? generatePodcastWithModel)(informationPackage, baseline, { signal: options.signal })
    : { script: baseline, generation: {
      mode: "template" as const, provider: "deterministic" as const,
      promptVersion: `${input.form}-deterministic-v1`,
      generatedAt: new Date().toISOString(), durationMs: 0
    } };
  options.signal?.throwIfAborted();
  const { script, generation } = generated;

  const pipeline = createSpeechPipeline();
  const audioPlan = await pipeline.plan(script);
  const srt = pipeline.subtitles.toSrt(pipeline.cues(script, audioPlan));
  const now = new Date().toISOString();
  const draft = PodcastDraftSchema.parse({
    id: draftId,
    title: script.title,
    form: script.form,
    status: "draft",
    package: informationPackage,
    script,
    audioPlan,
    srt,
    generation,
    createdAt: now,
    updatedAt: now
  });
  await insertPodcastDraft(draft);
  return draft;
}
