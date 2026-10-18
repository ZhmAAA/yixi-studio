import { FIXED_DISCLOSURE } from "@/lib/disclaimer";
import {
  DialogueScriptSchema,
  InformationPackageSchema,
  OrchestrationRequestSchema,
  type DialogueScript,
  type DialogueSpeaker,
  type DialogueTurn,
  type InformationPackage,
  type InterviewConfig
} from "@/server/podcast/contracts";

export type { InterviewConfig } from "@/server/podcast/contracts";

type Beat = {
  text: string;
  sourceId?: string;
};

type InterviewOptions = {
  scriptId?: string;
};

const STOP_TOKENS = new Set([
  "我们", "他们", "这个", "一个", "没有", "可以", "因为", "所以", "如果", "但是", "以及", "今天", "材料", "不是"
]);

/**
 * InterviewOrchestrator
 * 确定性访谈编排，不调用模型。
 * 输入是信息包和访谈配置，输出是带说话人与回合的对谈稿。
 * 每一轮都要带上进料里的原句，避免写成与材料无关的填充句。
 */
export const InterviewOrchestrator = {
  name: "InterviewOrchestrator",
  promptVersion: "interview-deterministic-v1",
  model: "deterministic-stub",
  run: orchestrateInterview
};

export function splitSentences(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const parts = normalized.split(/(?<=[。！？!?])/).map((part) => part.trim()).filter((part) => part.length >= 4);
  return parts.length ? parts : [normalized];
}

export function spokenSentence(text: string, max = 180) {
  const sentence = splitSentences(text)[0] ?? text.replace(/\s+/g, " ").trim();
  if (sentence.length <= max) return sentence;
  const sliced = sentence.slice(0, max).replace(/[，、；,;：:]+$/g, "");
  return `${sliced}。`;
}

export function packageProbes(informationPackage: InformationPackage) {
  const texts = [
    ...informationPackage.sources.map((source) => source.excerpt),
    ...informationPackage.notes
  ];
  const probes = new Set<string>();
  for (const text of texts) {
    for (const sentence of splitSentences(text)) {
      if (sentence.length >= 4) probes.add(sentence.slice(0, 12));
    }
  }
  return [...probes];
}

function peopleFromRoles(tags: string[] | undefined, kind: "host" | "guest") {
  if (!tags?.length) return [];
  const names: string[] = [];
  for (const tag of tags) {
    const match = tag.match(/^(主持|主持人|嘉宾|host|guest)\s*[:：]\s*(.+)$/i);
    if (!match) continue;
    const label = match[1].toLowerCase();
    const isHost = label === "主持" || label === "主持人" || label === "host";
    if ((kind === "host") === isHost) names.push(match[2].trim());
  }
  return names.filter(Boolean);
}

function resolveHost(informationPackage: InformationPackage, config?: InterviewConfig) {
  return config?.hostName?.trim() || peopleFromRoles(informationPackage.roleTags, "host")[0] || "主持人";
}

function resolveGuests(informationPackage: InformationPackage, config?: InterviewConfig) {
  const named = (config?.guestNames ?? []).map((name) => name.trim()).filter(Boolean).slice(0, 3);
  if (named.length) return named;
  const tagged = peopleFromRoles(informationPackage.roleTags, "guest").slice(0, 3);
  return tagged.length ? tagged : ["嘉宾"];
}

function beatsFromPackage(informationPackage: InformationPackage) {
  const sources = informationPackage.sources.filter((source) => source.excerpt.trim().length >= 4);
  const sourceBeats: Beat[] = sources.map((source) => ({ text: source.excerpt.trim(), sourceId: source.id }));
  const noteBeats: Beat[] = informationPackage.notes
    .map((note) => note.trim())
    .filter((note) => note.length >= 4)
    .filter((note) => !sources.some((source) => source.excerpt.includes(note) || note.includes(source.excerpt.trim())))
    .map((note) => ({ text: note }));
  return (sourceBeats.length ? [...sourceBeats, ...noteBeats] : noteBeats);
}

function sourceIds(beat: Beat) {
  return beat.sourceId ? [beat.sourceId] : [];
}

function bound(text: string) {
  const trimmed = text.replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
  if (trimmed.length <= 2000) return trimmed;
  return `${trimmed.slice(0, 1998)}…`;
}

function sharedToken(left: string, right: string) {
  const tokens = left.match(/[\u4e00-\u9fff]{2,4}/g) ?? [];
  return tokens.find((token) => token.length >= 2 && !STOP_TOKENS.has(token) && right.includes(token));
}

function ensureStop(sentence: string) {
  return /[。！？!?]$/.test(sentence) ? sentence : `${sentence}。`;
}

function openingLine(title: string, guest: string, sentence: string, topicTags: string[] | undefined, truncated: boolean) {
  const topic = topicTags?.length ? `话题记在${topicTags.join("、")}。` : "";
  const more = truncated ? "后面还有材料，这一场先把前面几处听完。" : "";
  return `今天按访谈来谈「${title}」。${topic}${more}第一句我交给${guest}：${ensureStop(sentence)}`;
}

function readLine(text: string) {
  const parts = splitSentences(text).slice(0, 2).map((sentence) => ensureStop(spokenSentence(sentence)));
  if (parts.length <= 1) return `我按原文接住。${parts[0] ?? ensureStop(spokenSentence(text))}后面没有第二句，我就停在这里。`;
  return `我按原文接住。${parts[0]}下一句是：${parts[1]}`;
}

function followUpLine(guest: string, text: string, index: number) {
  const sentence = ensureStop(spokenSentence(text));
  if (index % 3 === 1) return `下一处原文是：${sentence}${guest}，它是接着上一句说，还是另起一件事？`;
  if (index % 3 === 2) return `${guest}，这里还有一句不能跳：${sentence}请只用这句里的词，告诉听众它补上了什么。`;
  return `我再核对一处：${sentence}${guest}，如果把这句拿掉，前面的话还站得住吗？请只根据原文回答。`;
}

function relateLine(previous: string, current: string) {
  const prev = ensureStop(spokenSentence(previous));
  const curr = ensureStop(spokenSentence(current));
  const shared = sharedToken(prev, curr);
  const link = shared
    ? `两处都写到「${shared}」，所以我把它们听成同一条线上的前后句。`
    : "两句各自说了一件事。我按出现的顺序接，不在中间补情节。";
  return `这句的原文是：${curr}上一句是：${prev}${link}`;
}

function clarifyQuestion(guest: string, text: string) {
  return `材料里这一句是：${ensureStop(spokenSentence(text))}${guest}，请分一下：这句是在陈述事情，还是已经带了评价？请用这句原文里的词回答。`;
}

function clarifyAnswer(text: string) {
  const sentence = ensureStop(spokenSentence(text));
  if (/认为|应该|必须|更好|不应该|值得|反对|支持/.test(sentence)) {
    return `这句里已经有评价的用词。原文是：${sentence}我不再替它解释为什么。`;
  }
  return `这句主要是在陈述。原文是：${sentence}里面没有「应该」或「认为」，所以我不把它说成某人的主张。`;
}

function closingLine(title: string, beats: Beat[]) {
  const heard = beats.map((beat, index) => `${index === 0 ? "先是" : "然后是"}${ensureStop(spokenSentence(beat.text))}`);
  return `「${title}」的访谈收到这里。${heard.join("")}这些都是进料里的原句，这一场不再追加材料外面的判断。`;
}

function assertGrounded(turns: DialogueTurn[], informationPackage: InformationPackage) {
  const probes = packageProbes(informationPackage);
  if (!probes.length) throw new Error("信息包里没有可核对的句子");
  const missed = turns.some((turn) => !probes.some((probe) => turn.text.includes(probe)));
  if (missed) throw new Error("访谈稿有一轮没有用到进料原文");
}

export function orchestrateInterview(
  rawPackage: InformationPackage,
  config?: InterviewConfig,
  options: InterviewOptions = {}
): DialogueScript {
  const informationPackage = InformationPackageSchema.parse(rawPackage);
  const hostName = resolveHost(informationPackage, config);
  const guestNames = resolveGuests(informationPackage, config);
  const speakers: DialogueSpeaker[] = [
    { id: "host", name: hostName, role: "host" },
    ...guestNames.map((name, index) => ({
      id: `guest-${index + 1}`,
      name,
      role: "guest" as const
    }))
  ];
  const allBeats = beatsFromPackage(informationPackage);
  if (!allBeats.length) throw new Error("信息包里没有够长的句子，写不下访谈");
  const beats = allBeats.slice(0, 4);
  const ceiling = config?.targetTurns && config.targetTurns >= 5 ? config.targetTurns : undefined;
  const turns: DialogueTurn[] = [];

  function push(speakerId: string, text: string, stageDirection: string, ids: string[]) {
    turns.push({
      sequence: turns.length + 1,
      speakerId,
      text: bound(text),
      stageDirection,
      sourceIds: ids
    });
  }

  const firstGuest = speakers[1];
  push(
    "host",
    openingLine(informationPackage.title, firstGuest.name, spokenSentence(beats[0].text), informationPackage.topicTags, allBeats.length > beats.length),
    "开场，面向听众",
    sourceIds(beats[0])
  );
  push(firstGuest.id, readLine(beats[0].text), "接过开场", sourceIds(beats[0]));

  for (let index = 1; index < beats.length; index += 1) {
    if (ceiling && turns.length + 2 > ceiling - 1) break;
    const guest = speakers[((index - 1) % (speakers.length - 1)) + 1];
    push("host", followUpLine(guest.name, beats[index].text, index), "追问", sourceIds(beats[index]));
    push(guest.id, relateLine(beats[index - 1].text, beats[index].text), "按原文回答", [...new Set([...sourceIds(beats[index - 1]), ...sourceIds(beats[index])])]);
  }

  const askedFollowUp = turns.length > 2;
  if (!askedFollowUp && (!ceiling || turns.length + 2 <= ceiling - 1)) {
    push("host", clarifyQuestion(firstGuest.name, beats[0].text), "追问", sourceIds(beats[0]));
    push(firstGuest.id, clarifyAnswer(beats[0].text), "按原文回答", sourceIds(beats[0]));
  }

  const used = beats.slice(0, Math.max(1, turns.filter((turn) => turn.speakerId !== "host").length));
  const heard = used.length ? used : [beats[0]];
  push("host", closingLine(informationPackage.title, heard), "收束", [...new Set(heard.flatMap(sourceIds))]);

  const known = new Set(speakers.map((speaker) => speaker.id));
  if (turns.some((turn) => !known.has(turn.speakerId))) throw new Error("出现了未入席的说话人");
  assertGrounded(turns, informationPackage);

  return DialogueScriptSchema.parse({
    id: options.scriptId?.trim() || `script-${informationPackage.id}`,
    title: `访谈：${informationPackage.title}`,
    form: "interview",
    packageId: informationPackage.id,
    speakers,
    turns,
    disclosure: FIXED_DISCLOSURE,
    tone: config?.tone?.trim() || undefined
  });
}

export function runOrchestration(raw: unknown, options?: InterviewOptions): DialogueScript {
  const request = OrchestrationRequestSchema.parse(raw);
  if (request.form !== "interview") {
    throw new Error("辩论和圆桌已写入编排请求，这一版只实现访谈");
  }
  if (!request.package) {
    throw new Error("这一版需要在请求里带上信息包内容");
  }
  return orchestrateInterview(request.package, request.constraints, options);
}
