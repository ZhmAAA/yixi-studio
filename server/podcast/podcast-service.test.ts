import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createPodcastDraft } from "@/server/services/podcast-service";
import { getPodcastDraft, listPodcastDrafts } from "@/server/repositories/podcast-repository";
import { PodcastModelError } from "@/server/agents/model-config";

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

test("model drafts persist the validated result and server generation metadata in all forms", async () => {
  for (const form of ["interview", "debate", "roundtable"] as const) {
    let calls = 0;
    const created = await createPodcastDraft({ feedText, form, generationMode: "model" }, {
      generateModel: async (informationPackage, baseline) => {
        calls += 1;
        assert.equal(baseline.form, form);
        assert.equal(informationPackage.id, baseline.packageId);
        return {
          script: { ...baseline, title: `模型输出：${form}`, turns: baseline.turns.map((turn) => ({ ...turn, provenance: "synthetic" })) },
          generation: {
            mode: "model", provider: "openai-agents", model: "test-only-model", promptVersion: "test-prompt-v1",
            generatedAt: "2026-10-20T00:00:00.000Z", durationMs: 120,
            usage: { inputTokens: 80, outputTokens: 40, totalTokens: 120 }
          }
        };
      }
    });
    assert.equal(calls, 1);
    assert.equal(created.title, `模型输出：${form}`);
    assert.deepEqual(await getPodcastDraft(created.id), JSON.parse(JSON.stringify(created)));
  }
});

test("model failure never creates a template fallback or inserts a draft", async () => {
  const count = (await listPodcastDrafts()).length;
  let calls = 0;
  await assert.rejects(createPodcastDraft({ feedText, generationMode: "model" }, {
    generateModel: async () => {
      calls += 1;
      throw new PodcastModelError("MODEL_INVALID_OUTPUT", "模型稿未通过校验", 502);
    }
  }), (error: unknown) => error instanceof PodcastModelError && error.code === "MODEL_INVALID_OUTPUT");
  assert.equal(calls, 1);
  assert.equal((await listPodcastDrafts()).length, count);
});

test("explicit template generation never calls the configured model", async () => {
  const created = await createPodcastDraft({ feedText, generationMode: "template" }, {
    generateModel: async () => { throw new Error("template must not call model"); }
  });
  assert.equal(created.generation?.mode, "template");
  assert.equal(created.generation?.provider, "deterministic");
  assert.equal(created.generation?.model, undefined);
});
