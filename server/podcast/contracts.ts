import { z } from "zod";

export const PodcastFormSchema = z.enum(["interview", "debate", "roundtable"]);
export type PodcastForm = z.infer<typeof PodcastFormSchema>;

export const CollectedBySchema = z.enum(["user", "ai", "mixed"]);
export type CollectedBy = z.infer<typeof CollectedBySchema>;

export const InformationSourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  url: z.string().min(1).max(500).optional(),
  excerpt: z.string().min(1).max(8000),
  collectedBy: z.enum(["user", "ai"]).optional()
});
export type InformationSource = z.infer<typeof InformationSourceSchema>;

export const InformationPackageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  collectedBy: CollectedBySchema,
  sources: z.array(InformationSourceSchema).max(20),
  notes: z.array(z.string().min(1).max(4000)).max(30),
  roleTags: z.array(z.string().min(1).max(40)).max(12).optional(),
  topicTags: z.array(z.string().min(1).max(40)).max(12).optional()
}).refine(
  (value) => value.sources.length > 0 || value.notes.length > 0,
  "信息包至少需要一条来源或笔记"
);
export type InformationPackage = z.infer<typeof InformationPackageSchema>;

export const OrchestrationConstraintsSchema = z.object({
  hostName: z.string().trim().min(1).max(40).optional(),
  guestNames: z.array(z.string().trim().min(1).max(40)).min(1).max(3).optional(),
  targetTurns: z.number().int().min(5).max(24).optional(),
  tone: z.string().trim().min(1).max(80).optional()
});
export type OrchestrationConstraints = z.infer<typeof OrchestrationConstraintsSchema>;
export type InterviewConfig = OrchestrationConstraints;

export const OrchestrationRequestSchema = z.object({
  form: PodcastFormSchema,
  packageId: z.string().min(1).optional(),
  package: InformationPackageSchema.optional(),
  constraints: OrchestrationConstraintsSchema.optional()
}).refine(
  (value) => Boolean(value.packageId || value.package),
  "需要信息包 id 或信息包内容"
);
export type OrchestrationRequest = z.infer<typeof OrchestrationRequestSchema>;

export const DialogueSpeakerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(40),
  role: z.enum(["host", "guest", "moderator", "panelist"])
});
export type DialogueSpeaker = z.infer<typeof DialogueSpeakerSchema>;

export const DialogueTurnSchema = z.object({
  sequence: z.number().int().positive(),
  speakerId: z.string().min(1),
  text: z.string().min(1).max(2000),
  stageDirection: z.string().min(1).max(80).optional(),
  sourceIds: z.array(z.string().min(1)).max(8)
});
export type DialogueTurn = z.infer<typeof DialogueTurnSchema>;

export const DialogueScriptSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(160),
  form: PodcastFormSchema,
  packageId: z.string().min(1),
  speakers: z.array(DialogueSpeakerSchema).min(2).max(6),
  turns: z.array(DialogueTurnSchema).min(4).max(24),
  disclosure: z.string().min(1).max(300),
  warnings: z.array(z.string()).default([]),
  tone: z.string().min(1).max(80).optional()
});
export type DialogueScript = z.infer<typeof DialogueScriptSchema>;

export const AudioPlanSegmentSchema = z.object({
  sequence: z.number().int().positive(),
  speakerId: z.string().min(1),
  voiceId: z.string().min(1).max(120).optional(),
  text: z.string().min(1).max(2000),
  durationMs: z.number().int().nonnegative(),
  audioIncluded: z.boolean()
});

export const EpisodeAudioPlanSchema = z.object({
  scriptId: z.string().min(1),
  providerId: z.string().min(1).max(40),
  status: z.enum(["stub", "planned", "ready"]),
  segments: z.array(AudioPlanSegmentSchema).min(1),
  totalDurationMs: z.number().int().nonnegative()
});
export type EpisodeAudioPlan = z.infer<typeof EpisodeAudioPlanSchema>;

export const SubtitleCueSchema = z.object({
  index: z.number().int().positive(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  speakerId: z.string().min(1).optional(),
  text: z.string().min(1).max(2200)
});
export type SubtitleCue = z.infer<typeof SubtitleCueSchema>;

export const PodcastDraftSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(160),
  form: PodcastFormSchema,
  status: z.literal("draft"),
  package: InformationPackageSchema,
  script: DialogueScriptSchema,
  audioPlan: EpisodeAudioPlanSchema,
  srt: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});
export type PodcastDraft = z.infer<typeof PodcastDraftSchema>;

export const InterviewRunInputSchema = z.object({
  feedText: z.string().trim().min(20, "进料至少 20 个字").max(20000, "进料请控制在 2 万字以内"),
  title: z.string().trim().max(120).optional(),
  hostName: z.string().trim().max(40).optional(),
  guestNames: z.array(z.string().trim().min(1).max(40)).min(1).max(3).optional(),
  collectedBy: CollectedBySchema.optional()
});
export type InterviewRunInput = z.infer<typeof InterviewRunInputSchema>;
