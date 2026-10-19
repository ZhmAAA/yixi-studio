import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createPodcastDraft } from "@/server/services/podcast-service";
import { getPodcastDraft, listPodcastDrafts } from "@/server/repositories/podcast-repository";

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "yixi-forms-"));
process.env.DATABASE_URL = "";
process.env.PODCAST_DB_PATH = path.join(directory, "drafts.sqlite");
test.after(() => fs.rmSync(directory, { recursive: true, force: true }));

const feedText = "来源：施工记录\n计划称夜间施工已停止。不对。补充记录称周末仍施工。\n\n来源：居民意见\n部分住户希望白天施工，但商户仍需要保留通行空间。\n\n笔记：材料没有统一衡量休息、通行和施工时长的标准。";

test("all three forms persist their speakers, citations, and form", async () => {
  for (const form of ["interview", "debate", "roundtable"] as const) {
    const created = await createPodcastDraft({ feedText, form });
    assert.equal(created.form, form);
    assert.equal(created.script.form, form);
    assert.equal(created.status, "draft");
    assert.ok(created.script.turns.some((turn) => turn.text.includes("不对。")));
    const loaded = await getPodcastDraft(created.id);
    assert.deepEqual(loaded, JSON.parse(JSON.stringify(created)));
  }
});

test("legacy requests default to interview, and failed requests do not create drafts", async () => {
  const legacy = await createPodcastDraft({ feedText });
  assert.equal(legacy.form, "interview");
  const count = (await listPodcastDrafts()).length;
  await assert.rejects(createPodcastDraft({ feedText, form: "debate", guestNames: ["只有一人"] }));
  await assert.rejects(createPodcastDraft({ feedText, form: "roundtable", guestNames: ["甲", "乙"], targetTurns: 5 }));
  assert.equal((await listPodcastDrafts()).length, count);
});
