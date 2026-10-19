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
  | { kind: "source"; title?: string; url?: string; lines: string[] }
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
  if (!excerpt) return;
  sources.push({
    title: source.title?.trim() || undefined,
    url: source.url,
    excerpt
  });
}

function takeUrl(lines: string[], preferredUrl?: string) {
  const urlLine = lines.find((line) => URL_RE.test(line));
  const url = preferredUrl || (urlLine ? URL_RE.exec(urlLine)?.[0] : undefined);
  // Only move a standalone URL into metadata. Inline links can share a line
  // with the entire source, so keep that line verbatim for later review.
  const excerpt = lines.filter((line) => line.trim() !== url).join("\n");
  return { url, excerpt };
}

function sourceHeader(value: string) {
  const url = URL_RE.exec(value)?.[0];
  if (!url) return { title: value || undefined, url: undefined };
  const markdownLink = value.match(/^\[([^\]]+)\]\(https?:\/\/[^)]+\)$/i);
  const title = markdownLink?.[1] ?? value.replace(url, "").replace(/^[\s(<]+|[\s)>]+$/g, "");
  return { title: title.trim() || undefined, url };
}

function checkLength(value: string | undefined, max: number, label: string) {
  if (value && value.length > max) {
    throw new Error(`${label}超过 ${max} 个字，请缩短该项后重试；材料未保存。`);
  }
}

function uniqueWithinLimits(items: string[], maxLength: number, maxCount: number, label: string) {
  const unique = [...new Set(items.map((item) => item.trim()).filter(Boolean))];
  if (unique.length > maxCount) {
    throw new Error(`${label}超过 ${maxCount} 条，请拆成多个信息包后重试；材料未保存。`);
  }
  unique.forEach((item, index) => checkLength(item, maxLength, `第 ${index + 1} 条${label}`));
  return unique;
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
      const { url, excerpt } = takeUrl(bucket.lines, bucket.url);
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
      bucket = { kind: "source", ...sourceHeader(sourceTitle), lines: [] };
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

  if (!sources.length && !notes.length) throw new Error("进料里没有可整理的正文");
  if (!title) title = topicTags[0] || fallbackTitle(sources[0]?.excerpt || notes[0] || "");
  const resolvedCollected = collectedBy ?? "user";
  const sourceCollected = resolvedCollected === "ai" ? "ai" : resolvedCollected === "user" ? "user" : undefined;
  checkLength(title, 120, "标题");
  if (sources.length > 20) {
    throw new Error("来源超过 20 条，请拆成多个信息包后重试；材料未保存。");
  }
  sources.forEach((source, index) => {
    checkLength(source.title, 200, `第 ${index + 1} 条来源标题`);
    checkLength(source.url, 500, `第 ${index + 1} 条来源链接`);
    checkLength(source.excerpt, 8000, `第 ${index + 1} 条来源正文`);
  });

  return InformationPackageSchema.parse({
    id: options.id?.trim() || `pkg-${randomBytes(4).toString("hex")}`,
    title,
    collectedBy: resolvedCollected,
    sources: sources.map((source, index) => ({
      id: `src-${index + 1}`,
      title: source.title,
      url: source.url,
      excerpt: source.excerpt,
      collectedBy: sourceCollected
    })),
    notes: uniqueWithinLimits(notes, 4000, 30, "笔记"),
    roleTags: uniqueWithinLimits(roleTags, 40, 12, "角色标签"),
    topicTags: uniqueWithinLimits(topicTags, 40, 12, "话题标签")
  });
}
