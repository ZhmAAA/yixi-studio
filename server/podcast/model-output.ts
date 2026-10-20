import { z } from "zod";
import type { DialogueScript, DialogueTurn, InformationPackage, PodcastForm } from "@/server/podcast/contracts";

const ModelEvidenceSchema = z.object({
  sourceId: z.string().min(1).nullable(),
  noteIndex: z.number().int().nonnegative().nullable(),
  quote: z.string().min(1).max(8000)
}).strict();

const ModelTurnSchema = z.object({
  sequence: z.number().int().positive(),
  speakerId: z.string().min(1),
  text: z.string().min(1).max(2000),
  stage: z.enum(["opening", "position", "question", "response", "summary", "closing"]),
  provenance: z.enum(["quote", "summary", "synthetic"]),
  sourceIds: z.array(z.string().min(1)).max(8),
  noteIndexes: z.array(z.number().int().nonnegative()).max(8),
  evidence: z.array(ModelEvidenceSchema).min(1).max(16)
}).strict();

// Every property is required for the model's strict JSON output. Cross-field
// checks run below, outside the schema supplied to the model provider.
export const PodcastModelOutputSchema = z.object({
  title: z.string().min(1).max(160),
  turns: z.array(ModelTurnSchema).min(4).max(24),
  warnings: z.array(z.string().min(1).max(300)).max(12)
}).strict();

export type PodcastModelOutput = z.infer<typeof PodcastModelOutputSchema>;
export type PodcastModelEvidence = z.infer<typeof ModelEvidenceSchema>;
type ModelTurn = PodcastModelOutput["turns"][number];
export type ValidatedPodcastModelTurn = DialogueTurn & {
  provenance: ModelTurn["provenance"];
  evidence: PodcastModelEvidence[];
};

const VALIDATION_ERROR = "模型稿未通过结构与引用校验，请重试或调整材料。";
const EDITOR_WARNING = "引用已校验位置，事实与观点仍需编辑核对。";

function requireValid(condition: unknown): asserts condition {
  if (!condition) throw new Error(VALIDATION_ERROR);
}

function hasUniqueValues(values: Array<string | number>) {
  return new Set(values).size === values.length;
}

function validateEvidence(turn: ModelTurn, informationPackage: InformationPackage) {
  requireValid(turn.text.trim() && hasUniqueValues(turn.sourceIds) && hasUniqueValues(turn.noteIndexes));
  requireValid(turn.sourceIds.length + turn.noteIndexes.length > 0);
  const sources = new Map(informationPackage.sources.map((source) => [source.id, source.excerpt]));
  const citedSources = new Set<string>();
  const citedNotes = new Set<number>();
  for (const evidence of turn.evidence) {
    requireValid((evidence.sourceId !== null) !== (evidence.noteIndex !== null));
    // A punctuation-only fragment does not identify evidence. One-character
    // words and short negations remain valid when they occur in the material.
    requireValid(evidence.quote.trim() && /[\p{L}\p{N}]/u.test(evidence.quote));
    let original: string | undefined;
    if (evidence.sourceId !== null) {
      requireValid(turn.sourceIds.includes(evidence.sourceId));
      original = sources.get(evidence.sourceId);
      citedSources.add(evidence.sourceId);
    } else {
      const noteIndex = evidence.noteIndex!;
      requireValid(turn.noteIndexes.includes(noteIndex));
      original = informationPackage.notes[noteIndex];
      citedNotes.add(noteIndex);
    }
    requireValid(original !== undefined && original.includes(evidence.quote));
    if (turn.provenance === "quote") requireValid(turn.text.includes(evidence.quote));
  }
  requireValid(turn.sourceIds.every((id) => sources.has(id) && citedSources.has(id)));
  requireValid(turn.noteIndexes.every((index) => informationPackage.notes[index] !== undefined && citedNotes.has(index)));
}

function validateInterview(turns: ModelTurn[], hostId: string, guestIds: string[]) {
  requireValid(turns.some((turn) => turn.speakerId === hostId && turn.stage === "question"));
  let hasHostQuestion = false;
  for (const turn of turns) {
    if (turn.speakerId === hostId) {
      requireValid(turn.stage !== "response" && turn.stage !== "position");
      hasHostQuestion = turn.stage === "opening" || turn.stage === "question";
    } else {
      requireValid(turn.stage !== "question");
      if (turn.stage === "response") requireValid(hasHostQuestion);
    }
  }
  requireValid(guestIds.every((id) => turns.some((turn) => turn.speakerId === id && turn.stage === "response")));
}

function validateDebate(turns: ModelTurn[], debaterIds: string[]) {
  const body = turns.slice(1, -1);
  requireValid(body.length >= 8 && body.every((turn) => debaterIds.includes(turn.speakerId)));
  const positions = body.slice(0, 2);
  const summaries = body.slice(-2);
  requireValid(positions.every((turn) => turn.stage === "position") && hasUniqueValues(positions.map((turn) => turn.speakerId)));
  requireValid(summaries.every((turn) => turn.stage === "summary") && hasUniqueValues(summaries.map((turn) => turn.speakerId)));
  const exchanges = body.slice(2, -2);
  requireValid(exchanges.length >= 4 && exchanges.length % 2 === 0);
  for (let index = 0; index < exchanges.length; index += 2) {
    requireValid(exchanges[index].stage === "question" && exchanges[index + 1].stage === "response");
    requireValid(exchanges[index].speakerId !== exchanges[index + 1].speakerId);
  }
  requireValid(debaterIds.every((id) => exchanges.some((turn) => turn.speakerId === id && turn.stage === "question")
    && exchanges.some((turn) => turn.speakerId === id && turn.stage === "response")));
}

function validateRoundtable(turns: ModelTurn[], hostId: string, panelistIds: string[]) {
  const positions = new Set<string>();
  const responses = new Set<string>();
  for (const turn of turns.slice(1, -1)) {
    if (turn.speakerId === hostId) {
      requireValid(turn.stage === "question" || turn.stage === "summary");
    } else if (turn.stage === "position") {
      requireValid(!positions.has(turn.speakerId) && responses.size === 0);
      positions.add(turn.speakerId);
    } else {
      requireValid(positions.size === panelistIds.length);
      requireValid(turn.stage === "response" || turn.stage === "question" || turn.stage === "summary");
      if (turn.stage === "response") responses.add(turn.speakerId);
    }
  }
  requireValid(panelistIds.every((id) => positions.has(id) && responses.has(id)));
}

function stageDirection(stage: ModelTurn["stage"], form: PodcastForm) {
  if (stage === "opening") return "主持开场";
  if (stage === "closing") return "主持收束";
  if (stage === "position") return form === "roundtable" ? "逐人开场" : "立论";
  if (stage === "question") return form === "debate" ? "质询" : "提问";
  if (stage === "response") return form === "roundtable" ? "交叉回应" : form === "interview" ? "回答" : "回应";
  return "总结";
}

function validateOutput(raw: unknown, informationPackage: InformationPackage, baseline: DialogueScript): DialogueScript {
  const output = PodcastModelOutputSchema.parse(raw);
  requireValid(output.title.trim() && informationPackage.id === baseline.packageId);
  requireValid(hasUniqueValues(informationPackage.sources.map((source) => source.id)));
  requireValid(hasUniqueValues(baseline.speakers.map((speaker) => speaker.id)));
  const host = baseline.speakers.filter((speaker) => speaker.role === "host" || speaker.role === "moderator");
  requireValid(host.length === 1);
  const participants = baseline.speakers.filter((speaker) => speaker.id !== host[0].id);
  const participantRole = baseline.form === "interview" ? "guest" : baseline.form === "debate" ? "debater" : "panelist";
  requireValid(participants.every((speaker) => speaker.role === participantRole));
  requireValid(baseline.form === "interview" ? participants.length >= 1 && participants.length <= 3
    : baseline.form === "debate" ? participants.length === 2 : participants.length >= 2 && participants.length <= 4);
  requireValid(output.turns.length <= baseline.turns.length);
  const first = output.turns[0];
  const last = output.turns.at(-1)!;
  requireValid(first.stage === "opening" && first.speakerId === host[0].id);
  requireValid(last.stage === "closing" && last.speakerId === host[0].id);
  const knownSpeakers = new Set(baseline.speakers.map((speaker) => speaker.id));
  for (const [index, turn] of output.turns.entries()) {
    requireValid(turn.sequence === index + 1 && knownSpeakers.has(turn.speakerId));
    requireValid(turn.stage !== "opening" || index === 0);
    requireValid(turn.stage !== "closing" || index === output.turns.length - 1);
    validateEvidence(turn, informationPackage);
  }
  requireValid(baseline.speakers.every((speaker) => output.turns.some((turn) => turn.speakerId === speaker.id)));
  const participantIds = participants.map((speaker) => speaker.id);
  if (baseline.form === "interview") validateInterview(output.turns, host[0].id, participantIds);
  else if (baseline.form === "debate") validateDebate(output.turns, participantIds);
  else validateRoundtable(output.turns, host[0].id, participantIds);

  const citedSources = new Set(output.turns.flatMap((turn) => turn.sourceIds));
  const citedNotes = new Set(output.turns.flatMap((turn) => turn.noteIndexes));
  const missingSources = informationPackage.sources.filter((source) => !citedSources.has(source.id)).length;
  const missingNotes = informationPackage.notes.filter((_, index) => !citedNotes.has(index)).length;
  // Model-provided warnings cannot attest to coverage or erase server warnings.
  const warnings = [EDITOR_WARNING];
  if (missingSources || missingNotes) {
    warnings.push(`本次有 ${missingSources} 条来源、${missingNotes} 条笔记未被模型引用，请核对遗漏的材料、限定与更正。`);
  }
  const turns: ValidatedPodcastModelTurn[] = output.turns.map((turn) => ({
    sequence: turn.sequence,
    speakerId: turn.speakerId,
    text: turn.text,
    stageDirection: stageDirection(turn.stage, baseline.form),
    sourceIds: [...turn.sourceIds],
    noteIndexes: [...turn.noteIndexes],
    provenance: turn.provenance,
    evidence: turn.evidence.map((evidence) => ({ ...evidence }))
  }));
  return {
    id: baseline.id,
    title: output.title,
    form: baseline.form,
    packageId: baseline.packageId,
    speakers: baseline.speakers.map((speaker) => ({ ...speaker })),
    turns,
    disclosure: baseline.disclosure,
    warnings,
    ...(baseline.tone ? { tone: baseline.tone } : {})
  };
}

/** Validates citations and conversation structure, not the truth of generated claims. */
export function validatePodcastModelOutput(raw: unknown, informationPackage: InformationPackage, baseline: DialogueScript): DialogueScript {
  try {
    return validateOutput(raw, informationPackage, baseline);
  } catch {
    // Never send model text, source contents, or raw Zod diagnostics to clients.
    throw new Error(VALIDATION_ERROR);
  }
}
