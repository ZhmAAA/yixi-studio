import assert from "node:assert/strict";
import test from "node:test";
import { structureFeed } from "@/server/podcast/structure-feed";

test("an inline URL keeps the complete source line", () => {
  const feed = "过去三年，这条街的铺面换了四轮，详情见 https://example.com/street。住户最在意的是回家。";
  const informationPackage = structureFeed(feed);
  assert.equal(informationPackage.sources[0]?.url, "https://example.com/street");
  assert.equal(informationPackage.sources[0]?.excerpt, feed);
});

test("a standalone URL moves to metadata without removing surrounding lines", () => {
  const informationPackage = structureFeed("来源：居委会纪要\nhttps://example.com/street\n过去三年，这条街的铺面换了四轮。\n住户最在意的是回家。");
  assert.equal(informationPackage.sources[0]?.title, "居委会纪要");
  assert.equal(informationPackage.sources[0]?.url, "https://example.com/street");
  assert.equal(informationPackage.sources[0]?.excerpt, "过去三年，这条街的铺面换了四轮。\n住户最在意的是回家。");
});

test("URLs on source label lines become source links", () => {
  for (const [header, title] of [
    ["https://example.com/street", undefined],
    ["居委会纪要 https://example.com/street", "居委会纪要"],
    ["[居委会纪要](https://example.com/street)", "居委会纪要"]
  ] as const) {
    const informationPackage = structureFeed(`来源：${header}\n过去三年，这条街的铺面换了四轮。`);
    assert.equal(informationPackage.sources[0]?.title, title);
    assert.equal(informationPackage.sources[0]?.url, "https://example.com/street");
    assert.equal(informationPackage.sources[0]?.excerpt, "过去三年，这条街的铺面换了四轮。");
  }
});

test("a source label URL does not discard another URL from the body", () => {
  const informationPackage = structureFeed("来源：https://example.com/report\nhttps://example.com/appendix\n附录记录了住户的原始反馈。");
  assert.equal(informationPackage.sources[0]?.url, "https://example.com/report");
  assert.equal(informationPackage.sources[0]?.excerpt, "https://example.com/appendix\n附录记录了住户的原始反馈。");
});

test("short corrections and two-character negations remain separate source paragraphs", () => {
  const paragraphs = ["这笔款项确定已经到账。", "不对。", "并未"];
  const informationPackage = structureFeed(paragraphs.join("\n\n"));
  assert.deepEqual(informationPackage.sources.map((source) => source.excerpt), paragraphs);
});

test("a source at the size limit keeps its final correction", () => {
  const correction = "最后更正：实际换了两轮。";
  const feed = `${"甲".repeat(8000 - correction.length)}${correction}`;
  assert.equal(structureFeed(feed).sources[0]?.excerpt, feed);
  assert.throws(() => structureFeed(`甲${feed}`), /第 1 条来源正文超过 8000 个字.*材料未保存/);
});

test("too many source paragraphs are rejected instead of silently dropping the last one", () => {
  const paragraphs = Array.from({ length: 21 }, (_, index) => `第${index + 1}条资料记录了居民的完整反馈。`);
  const accepted = structureFeed(paragraphs.slice(0, 20).join("\n\n"));
  assert.equal(accepted.sources.length, 20);
  assert.equal(accepted.sources[19]?.excerpt, paragraphs[19]);
  assert.throws(() => structureFeed(paragraphs.join("\n\n")), /来源超过 20 条.*拆成多个信息包.*材料未保存/);
});

test("note-only packages retain all 30 notes without duplicating them as sources", () => {
  const notes = Array.from({ length: 31 }, (_, index) => `第${index + 1}条笔记记录了居民的完整反馈。`);
  const accepted = structureFeed(`笔记：\n${notes.slice(0, 30).join("\n")}`);
  assert.deepEqual(accepted.sources, []);
  assert.deepEqual(accepted.notes, notes.slice(0, 30));
  assert.throws(() => structureFeed(`笔记：\n${notes.join("\n")}`), /笔记超过 30 条.*材料未保存/);
});

test("long notes are rejected instead of losing their final text", () => {
  const correction = "最后更正：这里保留笔记的最后一句。";
  const note = `${"甲".repeat(4000 - correction.length)}${correction}`;
  assert.equal(structureFeed(`笔记：${note}`).notes[0], note);
  assert.throws(() => structureFeed(`笔记：甲${note}`), /第 1 条笔记超过 4000 个字.*材料未保存/);
});

test("oversized metadata returns actionable errors instead of being clipped", () => {
  const body = "过去三年，这条街的铺面换了四轮。";
  const cases: Array<[string, RegExp]> = [
    [`标题：${"甲".repeat(121)}\n${body}`, /标题超过 120 个字/],
    [`来源：${"甲".repeat(201)}\n${body}`, /第 1 条来源标题超过 200 个字/],
    [`来源：https://example.com/${"a".repeat(501)}\n${body}`, /第 1 条来源链接超过 500 个字/],
    [`角色：${"甲".repeat(41)}\n${body}`, /第 1 条角色标签超过 40 个字/],
    [`话题：${"甲".repeat(41)}\n${body}`, /第 1 条话题标签超过 40 个字/],
    [`角色：${Array.from({ length: 13 }, (_, index) => `嘉宾${index}`).join("；")}\n${body}`, /角色标签超过 12 条/],
    [`话题：${Array.from({ length: 13 }, (_, index) => `话题${index}`).join("；")}\n${body}`, /话题标签超过 12 条/]
  ];
  for (const [feed, message] of cases) assert.throws(() => structureFeed(feed), message);
});
