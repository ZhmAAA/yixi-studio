import { z } from "zod";

export const EpisodeCreateInputSchema = z.object({
  topicId: z.string().min(1),
  personIds: z.array(z.string().min(1)).min(2).max(3).refine(
    (ids) => new Set(ids).size === ids.length,
    "入席人物不能重复"
  ),
  format: z.literal("观点对谈"),
  duration: z.enum(["约 3 分钟", "约 4 分钟", "约 5 分钟"])
});

export type EpisodeCreateInput = z.infer<typeof EpisodeCreateInputSchema>;

export const EpisodeDraftSchema = z.object({
  title: z.string().min(1),
  question: z.string().min(1),
  topicId: z.string().min(1),
  personIds: z.array(z.string().min(1)).min(2),
  format: z.literal("观点对谈"),
  duration: z.string().min(1),
  combinationType: z.string().min(1),
  disclosure: z.string().min(1),
  turns: z.array(z.object({
    sequence: z.number().int().positive(),
    speakerId: z.string().min(1),
    text: z.string().min(1),
    provenance: z.enum(["观点摘要", "事实背景", "合成演绎"]),
    citationIds: z.array(z.string())
  })).min(1)
});

export type EpisodeDraft = z.infer<typeof EpisodeDraftSchema>;
