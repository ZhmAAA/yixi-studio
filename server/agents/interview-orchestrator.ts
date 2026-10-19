import { FIXED_DISCLOSURE } from "@/lib/disclaimer";
import {
  DialogueScriptSchema,
  InformationPackageSchema,
  OrchestrationRequestSchema,
  OrchestrationConstraintsSchema,
  type DialogueScript,
  type DialogueSpeaker,
  type DialogueTurn,
  type InformationPackage,
  type InterviewConfig
} from "@/server/podcast/contracts";
import {
  appendMaterialTurn,
  materialCoverageWarnings,
  materialsFromPackage,
  packageProbes,
  peopleFromRoles,
  type MaterialBeat as Beat
} from "@/server/podcast/materials";

export type { InterviewConfig } from "@/server/podcast/contracts";
export { packageProbes, splitSentences } from "@/server/podcast/materials";

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

function spokenExcerpt(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function resolveHost(informationPackage: InformationPackage, config?: InterviewConfig) {
  return config?.hostName?.trim() || peopleFromRoles(informationPackage.roleTags, "host")[0] || "主持人";
}

function resolveGuests(informationPackage: InformationPackage, config?: InterviewConfig) {
  const named = (config?.guestNames ?? []).map((name) => name.trim()).filter(Boolean);
  if (named.length > 3) throw new Error("访谈最多支持 3 位嘉宾，请减少嘉宾人数");
  if (named.length) return named;
  const tagged = peopleFromRoles(informationPackage.roleTags, "guest");
  if (tagged.length > 3) throw new Error("访谈最多支持 3 位嘉宾，请减少角色标签");
  return tagged.length ? tagged : ["嘉宾"];
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
  return `先完整读这一段材料：${ensureStop(spokenExcerpt(text))}`;
}

function followUpLine(guest: string, text: string, index: number) {
  const sentence = ensureStop(spokenExcerpt(text));
  if (index % 3 === 1) return `下一处原文是：${sentence}${guest}，它是接着上一句说，还是另起一件事？`;
  if (index % 3 === 2) return `${guest}，这里还有一句不能跳：${sentence}请只用这句里的词，告诉听众它补上了什么。`;
  return `我再核对一处：${sentence}${guest}，如果把这句拿掉，前面的话还站得住吗？请只根据原文回答。`;
}

function relateLine(previous: string, current: string) {
  const prev = ensureStop(spokenExcerpt(previous));
  const curr = ensureStop(spokenExcerpt(current));
  const shared = sharedToken(prev, curr);
  const link = shared
    ? `两处都写到「${shared}」，具体关联还需要核对，不能只凭同一个词下结论。`
    : "两句各自说了一件事。我按出现的顺序接，不在中间补情节。";
  return `这句的原文是：${curr}上一句是：${prev}${link}`;
}

function clarifyQuestion(guest: string, text: string) {
  return `材料里这一句是：${ensureStop(spokenExcerpt(text))}${guest}，请分一下：这句是在陈述事情，还是已经带了评价？请用这句原文里的词回答。`;
}

function clarifyAnswer(text: string) {
  return `先保留这段原文的完整语境：${ensureStop(spokenExcerpt(text))}事实是否成立、评价是否有依据，还需要核对来源。`;
}

function closingLine(title: string, beat: Beat) {
  return `「${title}」的访谈收到这里。最后再核对这一段：${ensureStop(spokenExcerpt(beat.text))}前面的材料与疑问保留在逐轮稿中，这里不追加材料外的结论。`;
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
  config = OrchestrationConstraintsSchema.parse(config ?? {});
  const hostName = resolveHost(informationPackage, config);
  const guestNames = resolveGuests(informationPackage, config);
  if (new Set([hostName, ...guestNames]).size !== guestNames.length + 1) {
    throw new Error("主持人和嘉宾需要使用不同的姓名");
  }
  const minimumTurns = Math.max(5, guestNames.length * 2 + 1);
  if (config.targetTurns && config.targetTurns < minimumTurns) {
    throw new Error(`让每位嘉宾发言至少需要 ${minimumTurns} 轮，请增加轮次或减少嘉宾`);
  }
  const speakers: DialogueSpeaker[] = [
    { id: "host", name: hostName, role: "host" },
    ...guestNames.map((name, index) => ({
      id: `guest-${index + 1}`,
      name,
      role: "guest" as const
    }))
  ];
  const allBeats = materialsFromPackage(informationPackage);
  const ceiling = config.targetTurns ?? 23;
  const beats = allBeats.slice(0, Math.floor((ceiling - 1) / 2));
  const turns: DialogueTurn[] = [];
  const heard: Beat[] = [beats[0]];

  function push(speakerId: string, text: string, stageDirection: string, materials: Beat[]) {
    appendMaterialTurn(turns, speakerId, text, stageDirection, materials);
  }

  const firstGuest = speakers[1];
  push(
    "host",
    openingLine(informationPackage.title, firstGuest.name, spokenExcerpt(beats[0].text), informationPackage.topicTags, allBeats.length > beats.length),
    "开场，面向听众",
    [beats[0]]
  );
  push(firstGuest.id, readLine(beats[0].text), "接过开场", [beats[0]]);

  for (let index = 1; index < beats.length; index += 1) {
    if (ceiling && turns.length + 2 > ceiling - 1) break;
    const guest = speakers[(index % guestNames.length) + 1];
    push("host", followUpLine(guest.name, beats[index].text, index), "追问", [beats[index]]);
    push(guest.id, relateLine(beats[index - 1].text, beats[index].text), "按原文回答", [beats[index - 1], beats[index]]);
    heard.push(beats[index]);
  }

  // Short feeds still give every configured guest a turn; do not list silent speakers.
  for (const guest of speakers.slice(1)) {
    const hasSpoken = turns.some((turn) => turn.speakerId === guest.id);
    if (hasSpoken && (turns.length > 2 || guestNames.length > 1)) continue;
    push("host", clarifyQuestion(guest.name, heard.at(-1)!.text), "追问", [heard.at(-1)!]);
    push(guest.id, clarifyAnswer(heard.at(-1)!.text), "按原文回答", [heard.at(-1)!]);
  }

  push("host", closingLine(informationPackage.title, heard.at(-1)!), "收束", [heard.at(-1)!]);

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
    warnings: materialCoverageWarnings(allBeats, heard.map((beat) => beat.key)),
    tone: config?.tone?.trim() || undefined
  });
}

export function runOrchestration(raw: unknown, options?: InterviewOptions): DialogueScript {
  const request = OrchestrationRequestSchema.parse(raw);
  if (request.form !== "interview") {
    throw new Error("此兼容入口只支持访谈，其他形式请使用统一编排入口");
  }
  if (!request.package) {
    throw new Error("这一版需要在请求里带上信息包内容");
  }
  return orchestrateInterview(request.package, request.constraints, options);
}
