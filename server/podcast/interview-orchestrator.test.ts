import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { InterviewOrchestrator, packageProbes, runOrchestration } from "@/server/agents/interview-orchestrator";
import { createSpeechPipeline } from "@/server/podcast/speech";
import { structureFeed } from "@/server/podcast/structure-feed";
import { openSqlitePodcastStore } from "@/server/repositories/sqlite-podcast-store";
import type { PodcastDraft } from "@/server/podcast/contracts";

const labeledFeed = [
  "标题：夜间的老街",
  "话题：城市更新、居住",
  "角色：主持：林夏；嘉宾：陈默",
  "",
  "来源：居委会纪要",
  "https://example.com/street",
  "过去三年，这条街的铺面换了四轮。住户最在意的不是招牌，而是夜里还能不能回家。",
  "",
  "笔记：",
  "夜间施工被投诉 27 次，主要集中在周三和周五。"
].join("\n");

test("structureFeed keeps sources, notes, and role tags", () => {
  const informationPackage = structureFeed(labeledFeed, { id: "pkg-street" });
  assert.equal(informationPackage.title, "夜间的老街");
  assert.deepEqual(informationPackage.topicTags, ["城市更新", "居住"]);
  assert.equal(informationPackage.sources[0]?.title, "居委会纪要");
  assert.equal(informationPackage.sources[0]?.url, "https://example.com/street");
  assert.match(informationPackage.sources[0]?.excerpt ?? "", /铺面换了四轮/);
  assert.match(informationPackage.notes[0] ?? "", /投诉 27 次/);
  assert.equal(informationPackage.sources.some((source) => source.excerpt.includes("投诉 27 次")), false);
});

test("interview script quotes the feed and names the host and guest", () => {
  const informationPackage = structureFeed(labeledFeed, { id: "pkg-street" });
  const first = InterviewOrchestrator.run(informationPackage, undefined, { scriptId: "script-street" });
  const second = InterviewOrchestrator.run(informationPackage, undefined, { scriptId: "script-street" });
  assert.deepEqual(first, second);
  assert.equal(first.form, "interview");
  assert.deepEqual(first.speakers.map((speaker) => speaker.name), ["林夏", "陈默"]);
  assert.ok(first.turns.length >= 5);
  const probes = packageProbes(informationPackage);
  for (const turn of first.turns) {
    assert.equal(probes.some((probe) => turn.text.includes(probe)), true, turn.text);
  }
  assert.match(first.turns.map((turn) => turn.text).join("\n"), /铺面换了四轮/);
  assert.match(first.turns.map((turn) => turn.text).join("\n"), /投诉 27 次/);
  assert.equal(first.turns.every((turn) => turn.stageDirection), true);
});

test("plain feed still becomes a host and guest interview", () => {
  const informationPackage = structureFeed("港口夜里仍在卸货。工人说班次被压缩到只剩换班的空档。", { id: "pkg-port" });
  const script = runOrchestration({
    form: "interview",
    packageId: informationPackage.id,
    package: informationPackage
  }, { scriptId: "script-port" });
  assert.deepEqual(script.speakers.map((speaker) => speaker.name), ["主持人", "嘉宾"]);
  assert.match(script.turns[0]?.text ?? "", /港口夜里仍在卸货/);
});

test("debate and roundtable stay unimplemented", () => {
  const informationPackage = structureFeed("材料只有这一句，用来确认辩论还不能编排。", { id: "pkg-wait" });
  assert.throws(
    () => runOrchestration({ form: "debate", package: informationPackage }),
    /只实现访谈/
  );
  assert.throws(
    () => runOrchestration({ form: "roundtable", package: informationPackage }),
    /只实现访谈/
  );
});

test("stub speech pipeline writes SRT without audio bytes", async () => {
  const informationPackage = structureFeed(labeledFeed, { id: "pkg-audio" });
  const script = InterviewOrchestrator.run(informationPackage, undefined, { scriptId: "script-audio" });
  const pipeline = createSpeechPipeline({ TTS_PROVIDER: "stub" });
  const plan = await pipeline.plan(script);
  assert.equal(plan.status, "stub");
  assert.equal(plan.providerId, "stub");
  assert.equal(plan.segments.every((segment) => segment.audioIncluded === false), true);
  assert.ok(plan.totalDurationMs > 0);
  const srt = pipeline.subtitles.toSrt(pipeline.cues(script, plan));
  assert.match(srt, /-->/);
  assert.match(srt, /林夏：/);
  assert.match(srt, /陈默：/);

  const pending = createSpeechPipeline({ TTS_PROVIDER: "elevenlabs", TTS_API_KEY: "" });
  const planned = await pending.plan(script);
  assert.equal(planned.status, "planned");
  assert.equal(planned.providerId, "elevenlabs");
  await assert.rejects(() => pending.tts.synthesize({ text: "不会真的去请求", speakerId: "host" }), /还没有适配器/);
});

test("sqlite store round-trips a podcast draft", async () => {
  const informationPackage = structureFeed(labeledFeed, { id: "pkg-db", collectedBy: "mixed" });
  const script = InterviewOrchestrator.run(informationPackage, undefined, { scriptId: "podcast-db" });
  const pipeline = createSpeechPipeline({ TTS_PROVIDER: "stub" });
  const audioPlan = await pipeline.plan(script);
  const now = "2026-10-18T00:00:00.000Z";
  const draft: PodcastDraft = {
    id: script.id,
    title: script.title,
    form: "interview",
    status: "draft",
    package: informationPackage,
    script,
    audioPlan,
    srt: pipeline.subtitles.toSrt(pipeline.cues(script, audioPlan)),
    createdAt: now,
    updatedAt: now
  };
  const file = path.join(os.tmpdir(), `yixi-podcast-${process.pid}.sqlite`);
  fs.rmSync(file, { force: true });
  const store = openSqlitePodcastStore(file);
  await store.insert(draft);
  const loaded = await store.get(draft.id);
  assert.equal(loaded?.script.turns.length, draft.script.turns.length);
  assert.equal(loaded?.package.collectedBy, "mixed");
  assert.match(loaded?.srt ?? "", /-->/);
  const listed = await store.list();
  assert.equal(listed[0]?.id, draft.id);
  fs.rmSync(file, { force: true });
});
