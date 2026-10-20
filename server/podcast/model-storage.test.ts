import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { runPodcastOrchestration } from "@/server/agents/podcast-orchestrator";
import { PodcastDraftSchema } from "@/server/podcast/contracts";
import { createSpeechPipeline } from "@/server/podcast/speech";
import { structureFeed } from "@/server/podcast/structure-feed";
import { draftToParams, PODCAST_SCHEMA_STATEMENTS } from "@/server/repositories/podcast-store";
import { openSqlitePodcastStore } from "@/server/repositories/sqlite-podcast-store";

test("an existing SQLite database migrates once and preserves both old drafts and model evidence", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "yixi-model-migration-"));
  const file = path.join(directory, "legacy.sqlite");
  const legacy = new DatabaseSync(file);
  legacy.exec(PODCAST_SCHEMA_STATEMENTS[0].replace("    generation_json TEXT,\n", ""));
  const informationPackage = structureFeed("来源：施工安排\n施工计划仍待审议，尚未得到全体居民同意。", { id: "pkg-legacy" });
  const script = runPodcastOrchestration({ form: "interview", package: informationPackage }, { scriptId: "legacy" });
  const pipeline = createSpeechPipeline({ TTS_PROVIDER: "stub" });
  const audioPlan = await pipeline.plan(script);
  const draft = PodcastDraftSchema.parse({
    id: "legacy", title: script.title, form: "interview", status: "draft", package: informationPackage, script, audioPlan,
    srt: pipeline.subtitles.toSrt(pipeline.cues(script, audioPlan)),
    createdAt: "2026-10-19T00:00:00.000Z", updatedAt: "2026-10-19T00:00:00.000Z"
  });
  legacy.prepare("INSERT INTO podcast_drafts (id,title,form,status,package_json,script_json,audio_plan_json,srt,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .run(...draftToParams(draft).slice(0, 10));
  legacy.close();
  const first = openSqlitePodcastStore(file) as ReturnType<typeof openSqlitePodcastStore> & { database: DatabaseSync };
  try {
    assert.deepEqual(await first.get("legacy"), JSON.parse(JSON.stringify(draft)));
    assert.equal((await first.get("legacy"))?.generation, undefined);
    const generated = PodcastDraftSchema.parse({ ...draft, id: "model-migrated", generation: {
      mode: "model", provider: "openai-agents", model: "test-model", promptVersion: "test-v1",
      generatedAt: "2026-10-20T00:00:00.000Z", durationMs: 550,
      usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 }
    }, script: { ...draft.script, turns: draft.script.turns.map((turn) => ({ ...turn, provenance: "summary", evidence: [{
      sourceId: informationPackage.sources[0].id, noteIndex: null, quote: informationPackage.sources[0].excerpt
    }] })) } });
    await first.insert(generated);
    first.database.close();
    const reopened = openSqlitePodcastStore(file) as typeof first;
    try {
      assert.deepEqual(await reopened.get("model-migrated"), JSON.parse(JSON.stringify(generated)));
      assert.equal((await reopened.list()).length, 2);
      assert.equal(reopened.database.prepare("PRAGMA table_info(podcast_drafts)").all().filter((row) => row.name === "generation_json").length, 1);
    } finally { reopened.database.close(); }
  } finally {
    try { first.database.close(); } catch { /* Already closed to test reopening. */ }
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
