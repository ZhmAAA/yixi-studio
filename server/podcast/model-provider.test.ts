import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { setTraceProcessors, type TracingProcessor } from "@openai/agents";
import { generatePodcastWithModel } from "@/server/agents/podcast-model";
import { getPodcastModelAvailability, PodcastModelError, readPodcastModelConfig, type PodcastModelConfig } from "@/server/agents/model-config";
import { runPodcastOrchestration } from "@/server/agents/podcast-orchestrator";
import type { InformationPackage } from "@/server/podcast/contracts";
import type { PodcastModelOutput } from "@/server/podcast/model-output";

const PRIVATE_MARKER = "test-only-private-marker";
const informationPackage: InformationPackage = {
  id: "pkg-provider-test", title: "该先公布施工时段吗", collectedBy: "user",
  sources: [{ id: "minutes", excerpt: "居民希望先公布施工时段，再讨论是否需要暂停夜间作业。" }], notes: []
};
const baseline = runPodcastOrchestration({ form: "interview", package: informationPackage }, { scriptId: "trusted-provider-test" });
const config: PodcastModelConfig = {
  apiKey: PRIVATE_MARKER, model: "fixture-dialogue-model", baseURL: "https://fixture.example.test/v1",
  api: "responses", timeoutMs: 2000, maxOutputTokens: 1500
};
const modelOutput: PodcastModelOutput = {
  title: "先知道什么时候施工，才能讨论要不要停工",
  turns: [
    { speakerId: "host", stage: "opening", text: "居民首先想知道作业时间。为什么这个问题要放在是否停工之前？" },
    { speakerId: "guest-1", stage: "response", text: "原记录把诉求写得很清楚：先公布时段，再讨论是否暂停。这个先后顺序应当保留。" },
    { speakerId: "host", stage: "question", text: "那如果公开了时间，是否就能理解成居民已经接受夜间作业？" },
    { speakerId: "guest-1", stage: "response", text: "不能。要求先公布时段没有回答是否接受夜间作业，后一个问题仍需要讨论。" },
    { speakerId: "host", stage: "closing", text: "我们先把公布信息和作出决定分开，保留居民原记录的先后顺序，继续核对后续意见。" }
  ].map((turn, index) => ({
    ...turn, stage: turn.stage as PodcastModelOutput["turns"][number]["stage"], sequence: index + 1,
    provenance: "summary", sourceIds: ["minutes"], noteIndexes: [],
    evidence: [{ sourceId: "minutes", noteIndex: null, quote: informationPackage.sources[0].excerpt }]
  })),
  warnings: []
};

function responsesFixture(text = JSON.stringify(modelOutput), status = "completed") {
  return {
    id: "resp_fixture", object: "response", created_at: 1780000000, status, error: null,
    incomplete_details: status === "incomplete" ? { reason: "max_output_tokens" } : null,
    instructions: null, max_output_tokens: config.maxOutputTokens, model: config.model,
    output: [{ id: "msg_fixture", type: "message", status, role: "assistant", content: [{ type: "output_text", text, annotations: [], logprobs: [] }] }],
    parallel_tool_calls: false, previous_response_id: null, reasoning: { effort: null, summary: null },
    store: false, temperature: 1, text: { format: { type: "text" } }, tool_choice: "auto", tools: [], top_p: 1,
    truncation: "disabled", user: null, metadata: {},
    usage: { input_tokens: 120, output_tokens: 80, total_tokens: 200, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 } }
  };
}

function chatFixture(text: string | null = JSON.stringify(modelOutput), finishReason = "stop", refusal: string | null = null) {
  return {
    id: "chatcmpl_fixture", object: "chat.completion", created: 1780000000, model: config.model, system_fingerprint: "fixture",
    choices: [{ index: 0, message: { role: "assistant", content: text, refusal, annotations: [] }, logprobs: null, finish_reason: finishReason }],
    usage: {
      prompt_tokens: 120, completion_tokens: 80, total_tokens: 200,
      prompt_tokens_details: { cached_tokens: 0, audio_tokens: 0 },
      completion_tokens_details: { reasoning_tokens: 0, audio_tokens: 0, accepted_prediction_tokens: 0, rejected_prediction_tokens: 0 }
    }
  };
}

type CapturedRequest = { url: string; method: string; body: Record<string, unknown>; headers: Headers };
function transport(fixture: unknown, status = 200) {
  const requests: CapturedRequest[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push({ url: request.url, method: request.method, body: JSON.parse(await request.text()), headers: request.headers });
    return new Response(JSON.stringify(fixture), { status, headers: { "content-type": "application/json", "x-request-id": "fixture-request" } });
  };
  return { requests, fetcher };
}

const outOfBandRequests: string[] = [];
const traceEvents: string[] = [];
const originalGlobalFetch = globalThis.fetch;
const tracingProcessor: TracingProcessor = {
  async onTraceStart() { traceEvents.push("trace-start"); },
  async onTraceEnd() { traceEvents.push("trace-end"); },
  async onSpanStart() { traceEvents.push("span-start"); },
  async onSpanEnd() { traceEvents.push("span-end"); },
  async shutdown() {},
  async forceFlush() {}
};
before(() => {
  // The real SDK runs, but no test may accidentally contact a provider or exporter.
  globalThis.fetch = async (input) => {
    outOfBandRequests.push(String(input));
    throw new Error("Unexpected outbound test request");
  };
  setTraceProcessors([tracingProcessor]);
});
after(() => {
  globalThis.fetch = originalGlobalFetch;
  setTraceProcessors([]);
  assert.deepEqual(outOfBandRequests, []);
  assert.deepEqual(traceEvents, []);
});

function assertStrictSchema(schema: unknown) {
  assert.ok(schema && typeof schema === "object");
  const object = schema as Record<string, unknown>;
  if (object.type === "object") {
    assert.equal(object.additionalProperties, false);
    assert.deepEqual([...(object.required as string[])].sort(), Object.keys(object.properties as object).sort());
  }
  Object.values(object).forEach((value) => {
    if (Array.isArray(value)) value.filter((child) => child && typeof child === "object").forEach(assertStrictSchema);
    else if (value && typeof value === "object") assertStrictSchema(value);
  });
}

for (const api of ["responses", "chat_completions"] as const) {
  test(`real Agents SDK ${api} request uses strict JSON, the selected model, no tools, storage, tracing, or retries`, async () => {
    const fixture = api === "responses" ? responsesFixture() : chatFixture();
    const { fetcher, requests } = transport(fixture);
    const result = await generatePodcastWithModel(informationPackage, baseline, { config: { ...config, api }, fetch: fetcher });
    assert.equal(requests.length, 1);
    const request = requests[0];
    assert.equal(request.url, `${config.baseURL}/${api === "responses" ? "responses" : "chat/completions"}`);
    assert.equal(request.method, "POST");
    assert.equal(request.headers.get("authorization"), `Bearer ${PRIVATE_MARKER}`);
    assert.equal(request.body.model, config.model);
    assert.equal(request.body.store, false);
    assert.equal((request.body.tools as unknown[] | undefined)?.length ?? 0, 0);
    const format = api === "responses"
      ? (request.body.text as { format: Record<string, unknown> }).format
      : (request.body.response_format as { json_schema: Record<string, unknown> }).json_schema;
    assert.equal(format.strict, true);
    assertStrictSchema(format.schema);
    const payload = JSON.stringify(request.body);
    assert.ok(payload.includes(informationPackage.sources[0].excerpt));
    assert.equal(payload.includes(baseline.turns[0].text), false, "The request must not ask the model to rewrite a template transcript.");
    assert.equal(payload.includes(PRIVATE_MARKER), false);
    assert.deepEqual(traceEvents, []);
    assert.deepEqual(outOfBandRequests, []);
    assert.equal(result.script.title, modelOutput.title);
    assert.equal(result.script.turns[1].text, modelOutput.turns[1].text);
    assert.notEqual(result.script.turns[1].text, baseline.turns[1].text);
    assert.equal(result.script.id, baseline.id);
    assert.deepEqual(result.generation.usage, { inputTokens: 120, outputTokens: 80, totalTokens: 200 });
    assert.equal(result.generation.mode, "model");
    assert.equal(result.generation.provider, "openai-agents");
    assert.equal(result.generation.model, config.model);
    assert.ok(result.generation.durationMs >= 0);
    assert.ok(Number.isFinite(Date.parse(result.generation.generatedAt)));
  });
}

function safeError(expectedCode?: string) {
  return (error: unknown) => {
    assert.ok(error instanceof PodcastModelError);
    if (expectedCode) assert.equal(error.code, expectedCode);
    assert.equal(error.message.includes(PRIVATE_MARKER), false);
    assert.equal(error.message.includes(config.baseURL), false);
    assert.equal(error.message.includes(informationPackage.sources[0].excerpt), false);
    assert.match(error.message, /未保存/);
    return true;
  };
}

test("invalid source evidence is rejected after the SDK call and never falls back to the baseline", async () => {
  const invalid = structuredClone(modelOutput);
  invalid.turns[1].evidence[0].quote = PRIVATE_MARKER;
  for (const api of ["responses", "chat_completions"] as const) {
    const { fetcher, requests } = transport(api === "responses" ? responsesFixture(JSON.stringify(invalid)) : chatFixture(JSON.stringify(invalid)));
    await assert.rejects(generatePodcastWithModel(informationPackage, baseline, { config: { ...config, api }, fetch: fetcher }), safeError("MODEL_INVALID_OUTPUT"));
    assert.equal(requests.length, 1);
  }
});

test("refusals and incomplete JSON remain failures with sanitized errors and a single request", async () => {
  const responseRefusal = responsesFixture() as unknown as { output: Array<{ content: unknown[] }> };
  responseRefusal.output[0].content = [{ type: "refusal", refusal: PRIVATE_MARKER }];
  const cases = [
    { api: "responses" as const, fixture: responseRefusal },
    { api: "chat_completions" as const, fixture: chatFixture(null, "stop", PRIVATE_MARKER) },
    { api: "responses" as const, fixture: responsesFixture(`{"title":"${PRIVATE_MARKER}`, "incomplete") },
    { api: "chat_completions" as const, fixture: chatFixture(`{"title":"${PRIVATE_MARKER}`, "length") }
  ];
  for (const { api, fixture } of cases) {
    const { fetcher, requests } = transport(fixture);
    await assert.rejects(generatePodcastWithModel(informationPackage, baseline, { config: { ...config, api }, fetch: fetcher }), safeError());
    assert.equal(requests.length, 1);
  }
});

for (const api of ["responses", "chat_completions"] as const) {
  test(`${api} rejects an unfinished terminal status even when its JSON is complete and valid`, async () => {
    const fixture = api === "responses"
      ? responsesFixture(JSON.stringify(modelOutput), "incomplete")
      : chatFixture(JSON.stringify(modelOutput), "length");
    const { fetcher, requests } = transport(fixture);
    await assert.rejects(generatePodcastWithModel(informationPackage, baseline, { config: { ...config, api }, fetch: fetcher }), safeError());
    assert.equal(requests.length, 1);
  });
}

test("401 and 429 errors never expose provider messages or start an implicit retry", async () => {
  for (const api of ["responses", "chat_completions"] as const) {
    for (const status of [401, 429]) {
      const { fetcher, requests } = transport({ error: { message: `${PRIVATE_MARKER} ${config.baseURL}`, type: "provider_error", code: "fixture_error" } }, status);
      await assert.rejects(generatePodcastWithModel(informationPackage, baseline, { config: { ...config, api }, fetch: fetcher }),
        safeError(status === 401 ? "MODEL_AUTH_FAILED" : "MODEL_RATE_LIMITED"));
      assert.equal(requests.length, 1);
    }
  }
});

function abortableTransport() {
  let calls = 0;
  let observedAbort = false;
  let signalStarted: () => void = () => {};
  const started = new Promise<void>((resolve) => { signalStarted = resolve; });
  const fetcher: typeof fetch = async (_input, init) => {
    calls += 1;
    signalStarted();
    return new Promise<Response>((_resolve, reject) => {
      const abort = () => { observedAbort = true; reject(init?.signal?.reason ?? new DOMException("Aborted", "AbortError")); };
      if (init?.signal?.aborted) abort();
      else init?.signal?.addEventListener("abort", abort, { once: true });
    });
  };
  return { fetcher, started, calls: () => calls, wasAborted: () => observedAbort };
}

test("external cancellation aborts SDK transport and a later call is still usable", async () => {
  const controller = new AbortController();
  const pending = abortableTransport();
  const generation = generatePodcastWithModel(informationPackage, baseline, { config, fetch: pending.fetcher, signal: controller.signal });
  await pending.started;
  controller.abort(new Error(PRIVATE_MARKER));
  await assert.rejects(generation, safeError("MODEL_CANCELLED"));
  assert.equal(pending.calls(), 1);
  assert.equal(pending.wasAborted(), true);
  const next = transport(responsesFixture());
  assert.equal((await generatePodcastWithModel(informationPackage, baseline, { config, fetch: next.fetcher })).generation.mode, "model");
  const preAborted = new AbortController();
  preAborted.abort();
  const unused = transport(responsesFixture());
  await assert.rejects(generatePodcastWithModel(informationPackage, baseline, { config, fetch: unused.fetcher, signal: preAborted.signal }), safeError("MODEL_CANCELLED"));
  assert.equal(unused.requests.length, 0);
});

test("deadline cancellation reaches the SDK transport and returns the timeout error", async () => {
  const pending = abortableTransport();
  // Inject a short deadline; production configuration enforces >= 1000 ms.
  const keepAlive = setTimeout(() => {}, 2000);
  try {
    await assert.rejects(generatePodcastWithModel(informationPackage, baseline, { config: { ...config, timeoutMs: 30 }, fetch: pending.fetcher }), safeError("MODEL_TIMEOUT"));
    assert.equal(pending.calls(), 1);
    assert.equal(pending.wasAborted(), true);
  } finally { clearTimeout(keepAlive); }
});

test("configuration validates defaults and endpoint safety while availability omits secrets", () => {
  const env = { OPENAI_API_KEY: PRIVATE_MARKER, AGENT_MODEL: "fixture-dialogue-model" };
  const defaults = readPodcastModelConfig(env);
  assert.equal(defaults.api, "responses");
  assert.equal(defaults.baseURL, "https://api.openai.com/v1");
  assert.equal(defaults.timeoutMs, 120000);
  assert.equal(defaults.maxOutputTokens, 12000);
  const availability = getPodcastModelAvailability({ ...env, OPENAI_BASE_URL: "https://private-endpoint.example.test/v1" });
  assert.equal(availability.ready, true);
  assert.equal(availability.model, env.AGENT_MODEL);
  assert.equal(JSON.stringify(availability).includes(PRIVATE_MARKER), false);
  assert.equal(JSON.stringify(availability).includes("private-endpoint"), false);
  for (const endpoint of ["https://user:secret@example.test/v1", "https://example.test/v1?key=secret", "https://example.test/v1#secret", "http://example.test/v1", "ftp://example.test/v1", "not-a-url"]) {
    assert.throws(() => readPodcastModelConfig({ ...env, OPENAI_BASE_URL: endpoint }), (error) => {
      assert.ok(error instanceof PodcastModelError);
      assert.equal(error.code, "MODEL_NOT_CONFIGURED");
      assert.equal(error.message.includes(endpoint), false);
      assert.equal(error.message.includes(PRIVATE_MARKER), false);
      return true;
    });
  }
  for (const invalid of [{}, { OPENAI_API_KEY: PRIVATE_MARKER }, { AGENT_MODEL: "model" }, { ...env, AGENT_API: "unsupported" }, { ...env, AGENT_TIMEOUT_MS: "999" }, { ...env, AGENT_MAX_OUTPUT_TOKENS: "25000" }]) {
    assert.throws(() => readPodcastModelConfig(invalid), PodcastModelError);
    assert.deepEqual(getPodcastModelAvailability(invalid), { ready: false, model: null, message: "真实模型尚未配置完成，当前可使用模板编排。" });
  }
  assert.equal(readPodcastModelConfig({ ...env, OPENAI_BASE_URL: "http://127.0.0.1:8080/v1/", AGENT_API: "chat_completions" }).baseURL, "http://127.0.0.1:8080/v1");
});
