import { DialogueTurnSchema, type DialogueTurn, type InformationPackage } from "@/server/podcast/contracts";

export type MaterialBeat = {
  key: string;
  text: string;
  sourceId?: string;
  noteIndex?: number;
};

export function splitSentences(text: string) {
  return text.replace(/\r\n/g, "\n")
    .split(/(?<=[。！？!?])|\n+|(?<=\.)\s+(?=[A-Z])/)
    .map((part) => part.replace(/\s+/g, " ").trim()).filter(Boolean);
}

// Keep full sentences and short qualifications; never trim a quotation to fit.
export function excerptChunks(text: string): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const sentence of splitSentences(text)) {
    if (sentence.length > 600) throw new Error("材料中有单句超过 600 字，请先分句或换行再编排");
    const joined = current ? `${current} ${sentence}` : sentence;
    if (joined.length > 600) {
      chunks.push(current);
      current = sentence;
    } else current = joined;
  }
  if (current) chunks.push(current);
  return chunks;
}

export function materialsFromPackage(informationPackage: InformationPackage): MaterialBeat[] {
  if (new Set(informationPackage.sources.map((source) => source.id)).size !== informationPackage.sources.length) {
    throw new Error("来源 id 不能重复，请为每条来源使用独立 id 后重试");
  }
  const sources = informationPackage.sources.filter((source) => source.excerpt.trim());
  const sourceBeats = sources.flatMap((source) => excerptChunks(source.excerpt).map((text, index) => ({
    key: `source:${source.id}:${index}`,
    text,
    sourceId: source.id
  })));
  const noteBeats = informationPackage.notes.flatMap((note, noteIndex) => {
    const trimmed = note.trim();
    if (!trimmed || sources.some((source) => source.excerpt.includes(trimmed))) return [];
    return excerptChunks(trimmed).map((text, index) => ({ key: `note:${noteIndex}:${index}`, text, noteIndex }));
  });
  const materials = [...sourceBeats, ...noteBeats];
  if (!materials.length) throw new Error("信息包里没有可核对的正文，请补充来源或笔记");
  return materials;
}

export function packageProbes(informationPackage: InformationPackage) {
  return [...new Set([
    ...informationPackage.sources.map((source) => source.excerpt),
    ...informationPackage.notes
  ].flatMap((text) => splitSentences(text).map((sentence) => sentence.slice(0, 12))))];
}

export function peopleFromRoles(tags: string[] | undefined, kind: "host" | "guest") {
  const names: string[] = [];
  for (const tag of tags ?? []) {
    const match = tag.match(/^(主持|主持人|嘉宾|辩手|圆桌嘉宾|host|guest|moderator|panelist|debater)\s*[:：]\s*(.+)$/i);
    if (!match) continue;
    const isHost = /^(主持|主持人|host|moderator)$/i.test(match[1]);
    if ((kind === "host") === isHost) names.push(match[2].trim());
  }
  return names.filter(Boolean);
}

export function appendMaterialTurn(
  turns: DialogueTurn[],
  speakerId: string,
  text: string,
  stageDirection: string,
  materials: MaterialBeat[]
) {
  if (!materials.length || materials.some((material) => !text.includes(material.text))) {
    throw new Error("编排有一轮没有保留所引用的完整材料，请检查模板");
  }
  if (text.length > 2000) throw new Error("编排有一轮超过 2000 字，请缩短材料片段后重试");
  turns.push(DialogueTurnSchema.parse({
    sequence: turns.length + 1,
    speakerId,
    text,
    stageDirection,
    sourceIds: [...new Set(materials.flatMap((material) => material.sourceId ? [material.sourceId] : []))],
    noteIndexes: [...new Set(materials.flatMap((material) => material.noteIndex === undefined ? [] : [material.noteIndex]))]
  }));
}

export function materialCoverageWarnings(all: MaterialBeat[], used: Iterable<string>) {
  const included = new Set(used);
  const usedCount = all.filter((material) => included.has(material.key)).length;
  return usedCount < all.length
    ? [`本次采用 ${usedCount}/${all.length} 个材料片段，受轮次上限限制，其余片段未进入稿件。请分批编排并核对遗漏的限定与更正。`]
    : [];
}

export function quoteMaterial(material: MaterialBeat) {
  return `材料原文：「${material.text}」`;
}
