import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { runPodcastOrchestration } from "@/server/agents/podcast-orchestrator";
import type { DialogueScript, InformationPackage, PodcastForm } from "@/server/podcast/contracts";
import {
  PodcastModelOutputSchema,
  validatePodcastModelOutput,
  type PodcastModelOutput,
  type ValidatedPodcastModelTurn
} from "@/server/podcast/model-output";

const INVALID = "模型稿未通过结构与引用校验，请重试或调整材料。";
const REVIEW_WARNING = "引用已校验位置，事实与观点仍需编辑核对。";
const informationPackage: InformationPackage = {
  id: "pkg-night-work",
  title: "夜间是否应该暂停街区施工",
  collectedBy: "mixed",
  sources: [
    { id: "minutes", title: "居民会议记录", excerpt: "居民要求停止夜间施工。不对。居民要求的是先公布施工时间。" },
    { id: "schedule", title: "施工方计划", excerpt: "施工方预计白天保留一条通道，具体安排尚未核实。" }
  ],
  notes: ["编辑尚未核对会议记录日期，需要保留这条限定。"]
};
type ModelTurn = PodcastModelOutput["turns"][number];

function baseline(form: PodcastForm, guestNames?: string[]) {
  return runPodcastOrchestration({ form, package: informationPackage, constraints: { tone: "自然讨论", ...(guestNames ? { guestNames } : {}) } }, { scriptId: `trusted-${form}` });
}

function modelTurn(sequence: number, speakerId: string, stage: ModelTurn["stage"]): ModelTurn {
  const reference = (sequence - 1) % 3;
  const quote = reference === 2 ? informationPackage.notes[0] : informationPackage.sources[reference].excerpt;
  const sourceId = reference === 2 ? null : informationPackage.sources[reference].id;
  const noteIndex = reference === 2 ? 0 : null;
  return {
    sequence, speakerId, stage,
    text: `请先保留原文：「${quote}」再讨论是否暂停夜间施工。`,
    provenance: "quote",
    sourceIds: sourceId === null ? [] : [sourceId],
    noteIndexes: noteIndex === null ? [] : [noteIndex],
    evidence: [{ sourceId, noteIndex, quote }]
  };
}

function validOutput(form: PodcastForm, suppliedBaseline = baseline(form)): PodcastModelOutput {
  const [host, ...guests] = suppliedBaseline.speakers;
  const plan: Array<[string, ModelTurn["stage"]]> = [[host.id, "opening"]];
  if (form === "interview") {
    plan.push([guests[0].id, "response"], [host.id, "question"]);
    guests.forEach((guest) => plan.push([guest.id, "response"]));
  } else if (form === "debate") {
    plan.push([guests[0].id, "position"], [guests[1].id, "position"],
      [guests[0].id, "question"], [guests[1].id, "response"],
      [guests[1].id, "question"], [guests[0].id, "response"],
      [guests[0].id, "summary"], [guests[1].id, "summary"]);
  } else {
    guests.forEach((guest) => plan.push([guest.id, "position"]));
    guests.forEach((guest) => plan.push([guest.id, "response"]));
  }
  plan.push([host.id, "closing"]);
  return {
    title: "先公布施工时间，还是直接暂停夜间作业？",
    turns: plan.map(([speakerId, stage], index) => modelTurn(index + 1, speakerId, stage)),
    warnings: []
  };
}

function mutate(output: PodcastModelOutput, change: (draft: PodcastModelOutput) => void) {
  const copy = structuredClone(output);
  change(copy);
  return copy;
}

function rejects(raw: unknown, trustedBaseline = baseline("interview"), material = informationPackage) {
  assert.throws(() => validatePodcastModelOutput(raw, material, trustedBaseline), (error) => {
    assert.equal((error as Error).message, INVALID);
    return true;
  });
}

test("model schema uses strict objects with every field required and nullable evidence targets", () => {
  const schema = z.toJSONSchema(PodcastModelOutputSchema);
  function inspect(value: unknown) {
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    assert.equal("default" in node, false);
    if (node.type === "object") {
      assert.equal(node.additionalProperties, false);
      assert.deepEqual([...(node.required as string[])].sort(), Object.keys(node.properties as object).sort());
    }
    Object.values(node).forEach((child) => Array.isArray(child) ? child.forEach(inspect) : inspect(child));
  }
  inspect(schema);
  assert.ok(PodcastModelOutputSchema.safeParse(validOutput("interview")).success);
});

test("valid interviews, debates, and roundtables keep authoritative baseline metadata", () => {
  for (const form of ["interview", "debate", "roundtable"] as const) {
    const trusted = baseline(form);
    const raw = validOutput(form, trusted);
    const before = structuredClone(trusted);
    const result = validatePodcastModelOutput(raw, informationPackage, trusted);
    assert.equal(result.id, trusted.id);
    assert.equal(result.form, form);
    assert.equal(result.packageId, informationPackage.id);
    assert.equal(result.disclosure, trusted.disclosure);
    assert.equal(result.tone, trusted.tone);
    assert.deepEqual(result.speakers, trusted.speakers);
    assert.equal(result.title, raw.title);
    assert.deepEqual(trusted, before);
    assert.deepEqual(result.warnings, [REVIEW_WARNING]);
    const first = result.turns[0] as ValidatedPodcastModelTurn;
    assert.equal(first.stageDirection, "主持开场");
    assert.equal(first.provenance, "quote");
    assert.deepEqual(first.evidence, raw.turns[0].evidence);
    assert.equal(result.turns.at(-1)?.stageDirection, "主持收束");
  }
});

test("natural summaries and synthetic positions can address the actual topic without copying templates", () => {
  const trusted = baseline("debate");
  const raw = validOutput("debate", trusted);
  raw.turns[1].provenance = "synthetic";
  raw.turns[1].text = "我倾向先公布时段，再让居民判断安排是否合理，而不是立即把夜间作业一概取消。";
  raw.turns[2].provenance = "summary";
  raw.turns[2].text = "材料里的原诉求有更正，且编辑还没有核对记录日期，暂时不能把它概括成居民要求全部停工。";
  raw.turns[7].provenance = "summary";
  raw.turns[7].text = "通道安排尚未核实，因此我保留对夜间施工方案的判断。";
  const result = validatePodcastModelOutput(raw, informationPackage, trusted);
  assert.equal(result.turns[1].text, raw.turns[1].text);
  assert.equal(result.turns[7].text, raw.turns[7].text);
  assert.equal(result.warnings[0], REVIEW_WARNING);
});

test("unknown authority fields and unsupported provenance are rejected at every nesting level", () => {
  const output = validOutput("interview");
  for (const key of ["id", "form", "disclosure", "model", "speakers", "packageId"]) {
    rejects({ ...output, [key]: "untrusted-authority-marker" });
  }
  for (const key of ["stageDirection", "role", "verified", "model"]) {
    const raw = structuredClone(output) as unknown as { turns: Array<Record<string, unknown>> };
    raw.turns[0][key] = "untrusted-authority-marker";
    rejects(raw);
  }
  const extraEvidence = structuredClone(output);
  (extraEvidence.turns[0].evidence[0] as unknown as Record<string, unknown>).verified = true;
  rejects(extraEvidence);
  for (const provenance of ["fact", "verified", "validated"]) {
    const raw = structuredClone(output) as unknown as { turns: Array<Record<string, unknown>> };
    raw.turns[0].provenance = provenance;
    rejects(raw);
  }
});

test("citation validation rejects unknown, ambiguous, missing, duplicate, and unlisted evidence targets", () => {
  const original = validOutput("interview");
  const cases: Array<(draft: PodcastModelOutput) => void> = [
    (draft) => { draft.turns[0].sourceIds = ["missing"]; draft.turns[0].evidence[0].sourceId = "missing"; },
    (draft) => { draft.turns[0].noteIndexes = [99]; draft.turns[0].sourceIds = []; draft.turns[0].evidence[0] = { sourceId: null, noteIndex: 99, quote: "不存在" }; },
    (draft) => { draft.turns[0].evidence[0].noteIndex = 0; },
    (draft) => { draft.turns[0].evidence[0].sourceId = null; },
    (draft) => { draft.turns[0].sourceIds.push("schedule"); },
    (draft) => { draft.turns[0].noteIndexes.push(0); },
    (draft) => { draft.turns[0].sourceIds.push("minutes"); },
    (draft) => { draft.turns[2].noteIndexes.push(0); },
    (draft) => { draft.turns[0].sourceIds = []; },
    (draft) => { draft.turns[0].evidence = []; },
    (draft) => { draft.turns[0].evidence.push({ sourceId: "schedule", noteIndex: null, quote: informationPackage.sources[1].excerpt }); }
  ];
  cases.forEach((change) => rejects(mutate(original, change)));
});

test("evidence must be a real nonempty substring and quotations must remain in quote text", () => {
  const original = validOutput("interview");
  for (const quote of ["来源中没有这句话", " ", "。", "\n\t"]) {
    rejects(mutate(original, (draft) => { draft.turns[0].evidence[0].quote = quote; }));
  }
  rejects(mutate(original, (draft) => { draft.turns[0].text = "只保留一个与引文不同的说法。"; }));
  const short = mutate(original, (draft) => {
    draft.turns[0].evidence[0].quote = "不对。";
    draft.turns[0].text = "原文中明确保留了更正：不对。";
  });
  assert.equal(validatePodcastModelOutput(short, informationPackage, baseline("interview")).turns[0].text, short.turns[0].text);
  const multi = mutate(original, (draft) => {
    draft.turns[0].sourceIds.push("schedule");
    draft.turns[0].evidence.push({ sourceId: "schedule", noteIndex: null, quote: informationPackage.sources[1].excerpt });
  });
  rejects(multi);
  multi.turns[0].text += informationPackage.sources[1].excerpt;
  assert.ok(validatePodcastModelOutput(multi, informationPackage, baseline("interview")));
});

test("sequence, speaker, host boundaries, and budget cannot be forged", () => {
  const original = validOutput("interview");
  const cases: Array<(draft: PodcastModelOutput) => void> = [
    (draft) => { draft.turns[1].sequence = 1; },
    (draft) => { draft.turns[1].sequence = 99; },
    (draft) => { draft.turns[1].speakerId = "invented-guest"; },
    (draft) => { draft.turns[0].speakerId = "guest-1"; },
    (draft) => { draft.turns.at(-1)!.speakerId = "guest-1"; },
    (draft) => { draft.turns[2].stage = "closing"; },
    (draft) => { draft.turns[2].stage = "opening"; },
    (draft) => { draft.turns[0].text = "文".repeat(2001); },
    (draft) => { draft.title = "   "; }
  ];
  cases.forEach((change) => rejects(mutate(original, change)));
  const excessive = structuredClone(original);
  excessive.turns.splice(-1, 0, modelTurn(5, "host", "question"), modelTurn(6, "guest-1", "response"),
    modelTurn(7, "host", "question"), modelTurn(8, "guest-1", "response"));
  excessive.turns.forEach((turn, index) => { turn.sequence = index + 1; });
  rejects(excessive);
});

test("interviews require host questions and an answer from every configured guest", () => {
  const trusted = baseline("interview", ["林夏", "周宁"]);
  const original = validOutput("interview", trusted);
  assert.ok(validatePodcastModelOutput(original, informationPackage, trusted));
  rejects(mutate(original, (draft) => { draft.turns[2].stage = "summary"; }), trusted);
  rejects(mutate(original, (draft) => {
    draft.turns.filter((turn) => turn.speakerId === "guest-2").forEach((turn) => { turn.stage = "summary"; });
  }), trusted);
  rejects(mutate(original, (draft) => { draft.turns[1].stage = "question"; }), trusted);
});

test("debates require both positions, reciprocal question-response pairs, and both final summaries", () => {
  const trusted = baseline("debate");
  const original = validOutput("debate", trusted);
  const cases: Array<(draft: PodcastModelOutput) => void> = [
    (draft) => { draft.turns[2].stage = "summary"; },
    (draft) => { draft.turns[4].stage = "question"; },
    (draft) => { draft.turns[4].speakerId = draft.turns[3].speakerId; },
    (draft) => { draft.turns[5].speakerId = "debater-1"; draft.turns[6].speakerId = "debater-2"; },
    (draft) => { draft.turns[7].stage = "response"; },
    (draft) => { draft.turns[8].speakerId = "debater-1"; },
    (draft) => { draft.turns[3].speakerId = "moderator"; }
  ];
  cases.forEach((change) => rejects(mutate(original, change), trusted));
});

test("roundtables require each participant's opening before cross-responses and every participant to respond", () => {
  for (const count of [2, 3, 4]) {
    const trusted = baseline("roundtable", ["甲", "乙", "丙", "丁"].slice(0, count));
    const original = validOutput("roundtable", trusted);
    assert.ok(validatePodcastModelOutput(original, informationPackage, trusted));
    rejects(mutate(original, (draft) => { draft.turns[1].stage = "response"; }), trusted);
    rejects(mutate(original, (draft) => { draft.turns[count].speakerId = "panelist-1"; }), trusted);
    rejects(mutate(original, (draft) => { draft.turns[count + 1].stage = "summary"; }), trusted);
  }
});

test("coverage and review warnings are recomputed by the server rather than trusting model warnings", () => {
  const raw = validOutput("interview");
  raw.turns = raw.turns.map((turn) => ({ ...turn, ...{
    sourceIds: ["minutes"], noteIndexes: [],
    evidence: [{ sourceId: "minutes", noteIndex: null, quote: informationPackage.sources[0].excerpt }],
    text: informationPackage.sources[0].excerpt
  } }));
  raw.warnings = ["所有材料均已覆盖，事实已验证，可以直接发布。"];
  const trusted = baseline("interview");
  trusted.warnings = ["旧模板覆盖提示，不能当作本次覆盖情况。"];
  const result = validatePodcastModelOutput(raw, informationPackage, trusted);
  assert.deepEqual(result.warnings, [REVIEW_WARNING, "本次有 1 条来源、1 条笔记未被模型引用，请核对遗漏的材料、限定与更正。"]);
  assert.equal(JSON.stringify(result).includes("事实已验证"), false);
  assert.equal(JSON.stringify(result).includes("旧模板覆盖提示"), false);
});

test("historical baseline scripts without new turn fields or warnings remain compatible", () => {
  const trusted = JSON.parse(JSON.stringify(baseline("interview"))) as DialogueScript;
  delete (trusted as Partial<DialogueScript>).warnings;
  trusted.turns.forEach((turn) => { delete turn.noteIndexes; });
  const raw = validOutput("interview", trusted);
  assert.ok(validatePodcastModelOutput(raw, informationPackage, trusted));
  rejects(raw, { ...trusted, packageId: "wrong-package" });
  rejects(raw, trusted, { ...informationPackage, sources: informationPackage.sources.map((source) => ({ ...source, id: "duplicate" })) });
});

test("all failures return one fixed message without leaking malformed model content", () => {
  for (const raw of [null, "malicious-secret-marker", {}, { title: "malicious-secret-marker", turns: "malicious-secret-marker" }]) {
    rejects(raw);
  }
  const raw = mutate(validOutput("interview"), (draft) => {
    draft.turns[0].evidence[0].quote = "malicious-secret-marker";
  });
  rejects(raw);
});
