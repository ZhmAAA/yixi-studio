import { randomBytes } from "node:crypto";
import {
  InformationPackageSchema,
  type CollectedBy,
  type InformationPackage
} from "@/server/podcast/contracts";

export type StructureFeedOptions = {
  id?: string;
  title?: string;
  collectedBy?: CollectedBy;
};

const URL_RE = /https?:\/\/[^\s)\]》」，。、]+/i;

type LooseSource = {
  title?: string;
  url?: string;
  excerpt: string;
};

type Bucket =
  | { kind: "source"; title?: string; lines: string[] }
  | { kind: "note"; lines: string[] }
  | { kind: "prose"; lines: string[] };

function cleanLine(line: string) {
  return line.replace(/^#{1,6}\s+/, "").replace(/^[-*•]\s+/, "").trim();
}

function splitTags(value: string) {
  return value.split(/[;；、,，]/).map((item) => item.trim()).filter(Boolean);
}

function labelValue(line: string, labels: string[]) {
  for (const label of labels) {
    const match = line.match(new RegExp(`^${label}\\s*[:：]\\s*(.*)$`, "i"));
    if (match) return match[1].trim();
  }
  return undefined;
}

function parseCollected(value: string): CollectedBy | undefined {
  const text = value.trim().toLowerCase().replace(/\s+/g, "");
  if (["mixed", "混合", "用户与ai", "人机"].includes(text) || text.includes("混合")) return "mixed";
  if (["ai", "模型", "ai搜集", "机器搜集"].includes(text) || text.includes("ai") || text.includes("模型")) return "ai";
  if (["user", "用户", "用户搜集", "人工", "人工搜集"].includes(text) || text.includes("用户") || text.includes("人工")) return "user";
  return undefined;
}

function fallbackTitle(excerpt: string) {
  const sentence = excerpt.replace(/\s+/g, " ").trim().split(/(?<=[。！？!?])/)[0]?.trim() ?? excerpt.trim();
  const bare = sentence.replace(/[。！？!?]+$/g, "");
  if (bare.length <= 28) return bare || "未命名访谈";
  const slice = bare.slice(0, 18);
  const cut = Math.max(slice.lastIndexOf("，"), slice.lastIndexOf("、"), slice.lastIndexOf("；"));
  const picked = (cut >= 8 ? slice.slice(0, cut) : slice).replace(/[，、；。！？!?]+$/g, "");
  return picked || "未命名访谈";
}

function pushSource(sources: LooseSource[], source: LooseSource) {
  const excerpt = source.excerpt.replace(/\s+\n/g, "\n").trim();
  if (excerpt.length < 4) return;
  sources.push({
    title: source.title?.trim() || undefined,
    url: source.url,
    excerpt
  });
}

function takeUrl(lines: string[]) {
  const urlLine = lines.find((line) => URL_RE.test(line));
  const url = urlLine ? URL_RE.exec(urlLine)?.[0] : undefined;
  const excerpt = lines.filter((line) => line !== urlLine).join("\n");
  return { url, excerpt };
}

export function structureFeed(raw: string, options: StructureFeedOptions = {}): InformationPackage {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  const sources: LooseSource[] = [];
  const notes: string[] = [];
  const topicTags: string[] = [];
  const roleTags: string[] = [];
  let title = options.title?.trim() || "";
  let collectedBy = options.collectedBy;
  let bucket: Bucket | null = null;

  function flush() {
    if (!bucket) return;
    if (bucket.kind === "note") {
      notes.push(...bucket.lines.filter(Boolean));
    } else if (bucket.kind === "source") {
      const { url, excerpt } = takeUrl(bucket.lines);
      pushSource(sources, { title: bucket.title, url, excerpt: excerpt || bucket.title || "" });
    } else {
      const { url, excerpt } = takeUrl(bucket.lines);
      pushSource(sources, url ? { url, excerpt } : { excerpt: bucket.lines.join("\n") });
    }
    bucket = null;
  }

  for (const rawLine of text.split("\n")) {
    const line = cleanLine(rawLine);
    if (!line) {
      flush();
      continue;
    }

    const titled = labelValue(line, ["标题", "题目"]);
    if (titled !== undefined) {
      flush();
      if (!title && titled) title = titled;
      continue;
    }

    const topics = labelValue(line, ["话题", "标签", "主题"]);
    if (topics !== undefined) {
      flush();
      topicTags.push(...splitTags(topics));
      continue;
    }

    const roles = labelValue(line, ["角色"]);
    if (roles !== undefined) {
      flush();
      roleTags.push(...splitTags(roles));
      continue;
    }

    const collected = labelValue(line, ["收集", "来源方"]);
    if (collected !== undefined) {
      flush();
      collectedBy ??= parseCollected(collected);
      continue;
    }

    const sourceTitle = labelValue(line, ["来源", "资料", "source"]);
    if (sourceTitle !== undefined) {
      flush();
      bucket = { kind: "source", title: sourceTitle || undefined, lines: [] };
      continue;
    }

    const noteBody = labelValue(line, ["笔记", "备注", "note"]);
    if (noteBody !== undefined) {
      flush();
      bucket = { kind: "note", lines: noteBody ? [noteBody] : [] };
      continue;
    }

    if (!bucket) bucket = { kind: "prose", lines: [] };
    bucket.lines.push(line);
  }
  flush();

  if (sources.length === 0 && notes.length > 0) {
    for (const note of notes) pushSource(sources, { excerpt: note });
  }

  if (!sources.length && !notes.length) throw new Error("进料里没有可整理的正文");
  if (!title) title = topicTags[0] || fallbackTitle(sources[0]?.excerpt || notes[0] || "");
  const resolvedCollected = collectedBy ?? "user";
  const sourceCollected = resolvedCollected === "ai" ? "ai" : resolvedCollected === "user" ? "user" : undefined;
  const unique = (items: string[], max: number) => [...new Set(items.map((item) => item.trim()).filter(Boolean))]
    .map((item) => item.slice(0, max))
    .filter(Boolean);

  return InformationPackageSchema.parse({
    id: options.id?.trim() || `pkg-${randomBytes(4).toString("hex")}`,
    title: title.slice(0, 120),
    collectedBy: resolvedCollected,
    sources: sources.slice(0, 20).map((source, index) => ({
      id: `src-${index + 1}`,
      title: source.title?.slice(0, 200),
      url: source.url && source.url.length <= 500 ? source.url : undefined,
      excerpt: source.excerpt.slice(0, 8000),
      collectedBy: sourceCollected
    })),
    notes: unique(notes, 4000).slice(0, 30),
    roleTags: unique(roleTags, 40).slice(0, 12),
    topicTags: unique(topicTags, 40).slice(0, 12)
  });
}
