export type PodcastModelConfig = {
  apiKey: string;
  model: string;
  baseURL: string;
  api: "responses" | "chat_completions";
  timeoutMs: number;
  maxOutputTokens: number;
};

export class PodcastModelError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message);
    this.name = "PodcastModelError";
  }
}

function configError() {
  return new PodcastModelError("MODEL_NOT_CONFIGURED", "模型配置尚未完成或无效，请联系维护者检查服务端模型配置。", 503);
}

function integer(value: string | undefined, fallback: number, min: number, max: number) {
  if (!value?.trim()) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw configError();
  return number;
}

// Read only on the server, at request time. Never return keys or endpoints to the browser.
export function readPodcastModelConfig(env: Record<string, string | undefined> = process.env): PodcastModelConfig {
  const apiKey = env.OPENAI_API_KEY?.trim();
  const model = env.AGENT_MODEL?.trim();
  const api = env.AGENT_API?.trim() || "responses";
  if (!apiKey || !model || model.length > 200 || (api !== "responses" && api !== "chat_completions")) throw configError();
  let url: URL;
  try { url = new URL(env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1"); }
  catch { throw configError(); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) || url.username || url.password || url.search || url.hash) throw configError();
  return {
    apiKey, model, baseURL: url.toString().replace(/\/$/, ""), api,
    timeoutMs: integer(env.AGENT_TIMEOUT_MS, 120000, 1000, 180000),
    maxOutputTokens: integer(env.AGENT_MAX_OUTPUT_TOKENS, 12000, 1000, 24000)
  };
}

export function getPodcastModelAvailability(env: Record<string, string | undefined> = process.env) {
  try {
    const config = readPodcastModelConfig(env);
    return { ready: true, model: config.model, message: "模型已配置，生成时会将本次信息包交给模型处理，结果仍需编辑审阅。" };
  } catch {
    return { ready: false, model: null, message: "真实模型尚未配置完成，当前可使用模板编排。" };
  }
}
