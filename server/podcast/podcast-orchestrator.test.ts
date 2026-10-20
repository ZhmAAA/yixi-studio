import assert from "node:assert/strict";
import test from "node:test";
import { runPodcastOrchestration } from "@/server/agents/podcast-orchestrator";
import {
  DialogueScriptSchema,
  InterviewRunInputSchema,
  PodcastRunInputSchema,
  type InformationPackage,
  type PodcastForm
} from "@/server/podcast/contracts";
import { createSpeechPipeline } from "@/server/podcast/speech";
import { structureFeed } from "@/server/podcast/structure-feed";

const forms: PodcastForm[] = ["interview", "debate", "roundtable"];
const sample: InformationPackage = {
  id: "pkg-council",
  title: "如何安排街区施工",
  collectedBy: "mixed",
  sources: [
    { id: "minutes", title: "会议纪要", excerpt: "居民要求保留夜间休息时间，材料没有给出统一阈值。" },
    { id: "plan", title: "施工计划", excerpt: "施工计划列出白天作业时段，但通行条件仍待核实。" }
  ],
  notes: ["编辑需核对会议记录的日期，以及是否遗漏不同意见。"]
};

test("podcast input keeps legacy defaults and accepts four roundtable names", () => {
  const input = { feedText: "这份材料已经完整超过二十个字，用来验证旧客户端请求仍然能够运行。" };
  assert.equal(PodcastRunInputSchema.parse(input).form, "interview");
  assert.equal(InterviewRunInputSchema.parse(input).form, "interview");
  const parsed = PodcastRunInputSchema.parse({ ...input, form: "roundtable", guestNames: ["甲", "乙", "丙", "丁"], targetTurns: 10, tone: "平实" });
  assert.equal(parsed.guestNames?.length, 4);
  assert.equal(parsed.targetTurns, 10);
  assert.equal(parsed.tone, "平实");
  assert.throws(() => PodcastRunInputSchema.parse({ ...input, guestNames: ["甲", "乙", "丙", "丁", "戊"] }));
});

test("debate has two positions, reciprocal challenges, responses, and both conclusions", () => {
  const script = runPodcastOrchestration({ form: "debate", package: sample, constraints: { targetTurns: 10 } });
  assert.equal(script.form, "debate");
  assert.deepEqual(script.speakers.map(({ name, role }) => [name, role]), [["主持人", "moderator"], ["论证方", "debater"], ["质询方", "debater"]]);
  assert.equal(script.turns.length, 10);
  assert.deepEqual(script.turns.map((turn) => turn.stageDirection), [
    "主持开场与辩题", "论证方立论", "质询方立论", "质询方质询", "论证方回应质询",
    "论证方反向质询", "质询方回应反向质询", "论证方总结", "质询方总结", "主持收束"
  ]);
  assert.deepEqual(script.turns.slice(3, 7).map((turn) => turn.speakerId), ["debater-2", "debater-1", "debater-1", "debater-2"]);
  assert.match(script.turns[1].text, /我的立论/);
  assert.match(script.turns[2].text, /反方立论/);
  assert.match(script.disclosure, /不表示资料作者或同名人物支持、反对/);
  assert.match(script.turns[0].text, /AI 演绎的模板角色/);
});

test("roundtables give each of two to four participants an opening and a cross-response", () => {
  const single = structureFeed("计划说施工会在白天进行，但具体通行安排仍需要核对。", { id: "pkg-one" });
  for (const count of [2, 3, 4]) {
    const names = ["林夏", "陈默", "周宁", "吴清"].slice(0, count);
    const minimum = count * 2 + 2;
    const script = runPodcastOrchestration({ form: "roundtable", package: single, constraints: { guestNames: names, targetTurns: minimum } });
    assert.equal(script.turns.length, minimum);
    assert.equal(script.speakers[0].role, "moderator");
    assert.equal(script.turns[0].speakerId, "moderator");
    assert.equal(script.turns.at(-1)?.speakerId, "moderator");
    for (const [index, speaker] of script.speakers.slice(1).entries()) {
      assert.equal(speaker.role, "panelist");
      const turns = script.turns.filter((turn) => turn.speakerId === speaker.id);
      assert.equal(turns.length, 2);
      assert.match(turns[0].stageDirection!, /逐人开场/);
      assert.match(turns[1].stageDirection!, /交叉回应/);
      assert.ok(turns[1].text.includes(names[(index + count - 1) % count]), turns[1].text);
    }
  }
  assert.equal(runPodcastOrchestration({ form: "roundtable", package: single }).speakers.length, 4);
});

test("speaker constraints reject incompatible forms and ambiguous identities", () => {
  for (const names of [["甲"], ["甲", "乙", "丙"]]) {
    assert.throws(() => runPodcastOrchestration({ form: "debate", package: sample, constraints: { guestNames: names } }), /正好 2 位辩手/);
  }
  assert.throws(() => runPodcastOrchestration({ form: "roundtable", package: sample, constraints: { guestNames: ["甲"] } }), /2–4 位嘉宾/);
  assert.throws(() => runPodcastOrchestration({ form: "interview", package: sample, constraints: { guestNames: ["甲", "乙", "丙", "丁"] } }), /最多支持 3 位嘉宾/);
  for (const form of ["debate", "roundtable"]) {
    assert.throws(() => runPodcastOrchestration({ form, package: sample, constraints: { guestNames: ["甲", "甲"] } }), /不同的姓名/);
    assert.throws(() => runPodcastOrchestration({ form, package: sample, constraints: { hostName: "甲", guestNames: ["甲", "乙"] } }), /不同的姓名/);
  }
  const tagged = { ...sample, roleTags: ["主持：林夏", "嘉宾：陈默", "嘉宾：周宁"] };
  assert.deepEqual(runPodcastOrchestration({ form: "debate", package: tagged }).speakers.map((speaker) => speaker.name), ["林夏", "陈默", "周宁"]);
});

test("minimum budgets are enforced before a participant or required stage can be omitted", () => {
  assert.throws(() => runPodcastOrchestration({ form: "debate", package: sample, constraints: { targetTurns: 9 } }), /至少需要 10 轮/);
  assert.throws(() => runPodcastOrchestration({ form: "roundtable", package: sample, constraints: { targetTurns: 7 } }), /至少需要 8 轮/);
  assert.throws(() => runPodcastOrchestration({ form: "roundtable", package: sample, constraints: { guestNames: ["甲", "乙", "丙", "丁"], targetTurns: 9 } }), /至少需要 10 轮/);
});

test("long material respects exact turn ceilings and reports uncovered material", () => {
  const informationPackage = structureFeed(Array.from({ length: 20 }, (_, index) => `第${index + 1}份材料包含一个需要核对的独立问题。`).join("\n\n"));
  const debate = runPodcastOrchestration({ form: "debate", package: informationPackage, constraints: { targetTurns: 10 } });
  assert.equal(debate.turns.length, 10);
  assert.match(debate.warnings[0], /4\/20/);
  assert.equal(debate.turns.some((turn) => turn.text.includes("第5份材料")), false);
  const roundtable = runPodcastOrchestration({ form: "roundtable", package: informationPackage, constraints: { guestNames: ["甲", "乙", "丙", "丁"], targetTurns: 10 } });
  assert.equal(roundtable.turns.length, 10);
  assert.match(roundtable.warnings[0], /8\/20/);
  for (const form of ["debate", "roundtable"]) {
    const full = runPodcastOrchestration({ form, package: informationPackage });
    assert.ok(full.turns.length <= 24);
    assert.equal(full.turns.at(-1)?.stageDirection, "主持收束");
  }
});

test("all forms preserve short corrections, negation, and later qualifications", () => {
  const informationPackage = structureFeed("来源：初步记录\n工厂去年收入一亿元。不对。实际金额仍待核对。\n\n并未\n\n笔记：收入包括一次性补贴，不代表可持续收入。");
  for (const form of forms) {
    const script = runPodcastOrchestration({ form, package: informationPackage });
    const spoken = script.turns.map((turn) => turn.text).join("\n");
    assert.match(spoken, /不对。 实际金额仍待核对。/);
    assert.match(spoken, /并未/);
    assert.match(spoken, /一次性补贴，不代表可持续收入/);
    assert.deepEqual(script.warnings, []);
    assert.ok(script.turns.every((turn) => turn.text.length <= 2000));
  }
});

test("every cited source and note is present in its turn, with no invented citation ids", () => {
  for (const form of forms) {
    const script = runPodcastOrchestration({ form, package: sample });
    const knownSpeakers = new Set(script.speakers.map((speaker) => speaker.id));
    for (const [index, turn] of script.turns.entries()) {
      assert.equal(turn.sequence, index + 1);
      assert.ok(knownSpeakers.has(turn.speakerId));
      assert.ok(turn.sourceIds.length + (turn.noteIndexes?.length ?? 0) > 0, turn.text);
      for (const id of turn.sourceIds) {
        const source = sample.sources.find((item) => item.id === id);
        assert.ok(source, id);
        assert.ok(turn.text.includes(source.excerpt), turn.text);
      }
      for (const noteIndex of turn.noteIndexes ?? []) {
        assert.ok(sample.notes[noteIndex]);
        assert.ok(turn.text.includes(sample.notes[noteIndex]), turn.text);
      }
    }
  }
});

test("note-only materials have note indexes and never pretend to be external sources", () => {
  const notes = structureFeed("笔记：本条记录是编辑观察，目前还没有找到公开来源。\n不对。\n这里需要保留更正并继续核对。");
  for (const form of forms) {
    const script = runPodcastOrchestration({ form, package: notes });
    assert.ok(script.turns.every((turn) => turn.sourceIds.length === 0));
    assert.ok(script.turns.every((turn) => (turn.noteIndexes?.length ?? 0) > 0));
    assert.ok(script.turns.some((turn) => turn.noteIndexes?.includes(1) && turn.text.includes("不对。")));
  }
});

test("sentence limits and ambiguous source identifiers fail without silently clipping quotes", () => {
  const tooLong = { ...sample, sources: [{ id: "source-long", excerpt: "甲".repeat(601) }], notes: [] };
  const duplicated = { ...sample, sources: sample.sources.map((source) => ({ ...source, id: "same" })) };
  for (const form of forms) {
    assert.throws(() => runPodcastOrchestration({ form, package: tooLong }), /单句超过 600 字/);
    assert.throws(() => runPodcastOrchestration({ form, package: duplicated }), /来源 id 不能重复/);
  }
  const boundary = { ...sample, sources: [{ id: "source-boundary", excerpt: `${"甲".repeat(599)}。不对。` }], notes: [] };
  for (const form of forms) {
    const script = runPodcastOrchestration({ form, package: boundary });
    assert.ok(script.turns.some((turn) => turn.text.includes(`${"甲".repeat(599)}。`)));
    assert.ok(script.turns.some((turn) => turn.text.includes("不对。")));
    assert.deepEqual(script.warnings, []);
  }
});

test("dispatcher validates package identity and remains deterministic", () => {
  assert.throws(() => runPodcastOrchestration({ form: "debate", packageId: "wrong", package: sample }), /id 与内容不一致/);
  assert.throws(() => runPodcastOrchestration({ form: "roundtable", packageId: sample.id }), /带上信息包内容/);
  for (const form of forms) {
    const request = { form, package: sample, constraints: { tone: "平实" } };
    const first = runPodcastOrchestration(request, { scriptId: "known-script" });
    const second = runPodcastOrchestration(request, { scriptId: "known-script" });
    assert.deepEqual(first, second);
    assert.equal(first.id, "known-script");
    assert.equal(first.tone, "平实");
  }
});

test("historical interview scripts without warnings or note indexes still parse", () => {
  const script = runPodcastOrchestration({ form: "interview", package: sample });
  const historical = JSON.parse(JSON.stringify(script));
  delete historical.warnings;
  historical.turns.forEach((turn: Record<string, unknown>) => { delete turn.noteIndexes; });
  const loaded = DialogueScriptSchema.parse(historical);
  assert.deepEqual(loaded.warnings, []);
  assert.ok(loaded.turns.every((turn) => turn.noteIndexes === undefined));
  assert.equal(loaded.form, "interview");
});

test("speech and subtitles retain speakers and ordering for both new forms", async () => {
  for (const form of ["debate", "roundtable"]) {
    const script = runPodcastOrchestration({ form, package: sample });
    const pipeline = createSpeechPipeline({ TTS_PROVIDER: "stub" });
    const plan = await pipeline.plan(script);
    const cues = pipeline.cues(script, plan);
    assert.equal(plan.segments.length, script.turns.length);
    assert.deepEqual(plan.segments.map((segment) => segment.speakerId), script.turns.map((turn) => turn.speakerId));
    assert.ok(plan.segments.every((segment) => !segment.audioIncluded));
    assert.equal(cues.at(-1)?.endMs, plan.totalDurationMs);
    assert.ok(cues.every((cue, index) => index === 0 || cue.startMs === cues[index - 1].endMs));
    const srt = pipeline.subtitles.toSrt(cues);
    script.speakers.forEach((speaker) => assert.ok(srt.includes(`${speaker.name}：`)));
  }
});
