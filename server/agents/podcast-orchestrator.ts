import { FIXED_DISCLOSURE } from "@/lib/disclaimer";
import { orchestrateInterview } from "@/server/agents/interview-orchestrator";
import {
  DialogueScriptSchema,
  InformationPackageSchema,
  OrchestrationConstraintsSchema,
  OrchestrationRequestSchema,
  type DialogueScript,
  type DialogueSpeaker,
  type DialogueTurn,
  type InformationPackage,
  type OrchestrationConstraints
} from "@/server/podcast/contracts";
import {
  appendMaterialTurn,
  materialCoverageWarnings,
  materialsFromPackage,
  peopleFromRoles,
  quoteMaterial,
  type MaterialBeat
} from "@/server/podcast/materials";

export type PodcastOrchestrationOptions = { scriptId?: string };
type GroupForm = "debate" | "roundtable";

const FORM_LABELS = { debate: "辩论", roundtable: "圆桌" } as const;
const ROLE_DISCLOSURE = "讨论分工与立场均为 AI 演绎的模板角色，不表示资料作者或同名人物支持、反对这些观点；引用原文不等于事实已核实。";

function groupContext(
  form: GroupForm,
  rawPackage: InformationPackage,
  rawConstraints: OrchestrationConstraints | undefined,
  options: PodcastOrchestrationOptions
) {
  const informationPackage = InformationPackageSchema.parse(rawPackage);
  const constraints = OrchestrationConstraintsSchema.parse(rawConstraints ?? {});
  const hostName = constraints.hostName || peopleFromRoles(informationPackage.roleTags, "host")[0] || "主持人";
  const tagged = peopleFromRoles(informationPackage.roleTags, "guest");
  const names = constraints.guestNames ?? (tagged.length ? tagged : form === "debate"
    ? ["论证方", "质询方"]
    : ["问题观察者", "证据观察者", "实践观察者"]);
  if (form === "debate" && names.length !== 2) throw new Error("辩论需要正好 2 位辩手，请填写两个不同姓名或清空使用默认角色");
  if (form === "roundtable" && (names.length < 2 || names.length > 4)) throw new Error("圆桌需要 2–4 位嘉宾，请调整嘉宾或角色标签");
  if (new Set([hostName, ...names]).size !== names.length + 1) throw new Error("主持人和嘉宾需要使用不同的姓名");
  const minimumTurns = form === "debate" ? 10 : names.length * 2 + 2;
  const ceiling = constraints.targetTurns ?? 24;
  if (ceiling < minimumTurns) {
    throw new Error(`${FORM_LABELS[form]}完整流程至少需要 ${minimumTurns} 轮，请增加轮次${form === "roundtable" ? "或减少圆桌嘉宾" : ""}`);
  }
  const speakers: DialogueSpeaker[] = [
    { id: "moderator", name: hostName, role: "moderator" },
    ...names.map((name, index) => ({
      id: `${form === "debate" ? "debater" : "panelist"}-${index + 1}`,
      name,
      role: form === "debate" ? "debater" as const : "panelist" as const
    }))
  ];
  const materials = materialsFromPackage(informationPackage);
  const turns: DialogueTurn[] = [];
  const used = new Set<string>();
  let cursor = 0;

  return {
    informationPackage, constraints, ceiling, speakers, materials, turns,
    takeMaterial() {
      const material = materials[Math.min(cursor, materials.length - 1)];
      cursor = Math.min(cursor + 1, materials.length);
      return material;
    },
    hasMoreMaterials() { return cursor < materials.length; },
    push(speakerId: string, text: string, stage: string, cited: MaterialBeat[]) {
      appendMaterialTurn(turns, speakerId, text, stage, cited);
      cited.forEach((material) => used.add(material.key));
    },
    finish(): DialogueScript {
      if (turns.length > ceiling) throw new Error("编排轮次超出预算，请检查流程设置");
      if (speakers.some((speaker) => !turns.some((turn) => turn.speakerId === speaker.id))) {
        throw new Error("编排未覆盖全部发言者，请检查轮次设置");
      }
      return DialogueScriptSchema.parse({
        id: options.scriptId?.trim() || `script-${form}-${informationPackage.id}`,
        title: `${FORM_LABELS[form]}：${informationPackage.title}`,
        form,
        packageId: informationPackage.id,
        speakers,
        turns,
        disclosure: `${FIXED_DISCLOSURE}${ROLE_DISCLOSURE}`,
        warnings: materialCoverageWarnings(materials, used),
        tone: constraints.tone
      });
    }
  };
}

/** A debate about what the supplied evidence can support, never invented author positions. */
export function orchestrateDebate(
  informationPackage: InformationPackage,
  constraints?: OrchestrationConstraints,
  options: PodcastOrchestrationOptions = {}
) {
  const context = groupContext("debate", informationPackage, constraints, options);
  const [host, advocate, challenger] = context.speakers;
  const opening = context.takeMaterial();
  context.push(host.id,
    `这一场的辩题是：现有材料能否作为讨论「${context.informationPackage.title}」的暂定判断依据？${advocate.name}主张允许可撤回的工作假设，${challenger.name}主张先核实再作判断。${ROLE_DISCLOSURE}先共同核对：${quoteMaterial(opening)}`,
    "主持开场与辩题", [opening]);
  context.push(advocate.id,
    `我的立论是：可以把这段材料作为暂定判断的依据，先提出一个允许撤回的工作假设，再继续核实。${quoteMaterial(opening)}这个假设只覆盖原文明说的内容，不扩展成普遍结论，也不等于事实已确认；这是本场角色的论证，不是替资料作者表态。`,
    "论证方立论", [opening]);
  const objection = context.takeMaterial();
  context.push(challenger.id,
    `我提出反方立论：在来源和适用范围完成核实之前，不应把材料提升为暂定判断的依据。${quoteMaterial(objection)}我要求先回答范围与例外的问题，再提出判断；否则“暂定”也可能让未经核实的内容先入为主。这是质询角色的立场，不是断言原文错误。`,
    "质询方立论", [objection]);

  let last = objection;
  function exchange(questioner: DialogueSpeaker, responder: DialogueSpeaker, material: MaterialBeat, argumentResponds: boolean) {
    if (argumentResponds) {
      context.push(questioner.id,
        `${responder.name}，你主张允许暂定判断。我质询这一点：${quoteMaterial(material)}仅凭这一段，哪些条件仍未得到证明？既然核实尚待完成，为什么不先暂缓判断，而要让工作假设先行？`,
        "质询方质询", [material]);
      context.push(responder.id,
        `我回应${questioner.name}：${quoteMaterial(material)}我的理由是，明确写出可撤回的工作假设，可以让后续核查有一个待检验对象。我收回超出原文的推断，但保留这个有限立场；适用对象、时间和例外需要另行核实，不能由我补成事实。`,
        "论证方回应质询", [material]);
    } else {
      context.push(questioner.id,
        `${responder.name}，你主张先核实再判断，我反过来追问标准：${quoteMaterial(material)}如果暂定判断明确标注“待核对、可撤回”，你仍要求完全暂停吗？你要求的补证，应当解决哪一个具体疑问？`,
        "论证方反向质询", [material]);
      context.push(responder.id,
        `回应${questioner.name}：${quoteMaterial(material)}我仍主张暂停暂定判断，但不反对收集与核对材料。我的理由是，“可撤回”的标签不能代替对来源与范围的核实；应先列出待回答的问题，并保留原文的限定与更正。我不会仅因提出质疑就宣布原文不成立。`,
        "质询方回应反向质询", [material]);
    }
    last = material;
  }

  exchange(challenger, advocate, context.takeMaterial(), true);
  exchange(advocate, challenger, context.takeMaterial(), false);
  let extraRound = 0;
  // Reserve both conclusions and the moderator's close before adding a pair.
  while (context.hasMoreMaterials() && context.turns.length + 2 + 3 <= context.ceiling) {
    const argumentResponds = extraRound++ % 2 === 0;
    exchange(argumentResponds ? challenger : advocate, argumentResponds ? advocate : challenger,
      context.takeMaterial(), argumentResponds);
  }

  context.push(advocate.id,
    `我的总结保留一条有限主张：${quoteMaterial(opening)}我赞成以原文为边界建立可撤回的工作假设，再继续核验；我没有证明超出原文的结论，也不把尚未核实的内容当作已确认事实。`,
    "论证方总结", [opening]);
  context.push(challenger.id,
    `我的总结是先核实，再作暂定判断：${quoteMaterial(last)}我反对让工作假设先行，但没有把原文自动判为错误。剩余争点是暂定判断应当出现在核验之前还是之后，以及来源、范围与例外如何核对。`,
    "质询方总结", [last]);
  context.push(host.id,
    `双方的分歧是允许可撤回的工作假设先行，还是先核实再作暂定判断。最后保留这段原文：${quoteMaterial(last)}本场不裁定输赢，也不替资料作者追加立场；待核对的问题和未覆盖材料请一并审阅。`,
    "主持收束", [last]);
  return context.finish();
}

const PANEL_FOCUSES = [
  { label: "问题与定义", question: "讨论中的对象和关键用词是否已经说清楚" },
  { label: "证据与范围", question: "来源、时间和适用范围是否足以支持当前判断" },
  { label: "执行与代价", question: "如果据此行动，还需要补充哪些条件与代价信息" },
  { label: "受影响者与例外", question: "还缺少谁的经历，以及哪些例外尚未被材料回答" }
] as const;

export function orchestrateRoundtable(
  informationPackage: InformationPackage,
  constraints?: OrchestrationConstraints,
  options: PodcastOrchestrationOptions = {}
) {
  const context = groupContext("roundtable", informationPackage, constraints, options);
  const [host, ...panelists] = context.speakers;
  const opening = context.materials[0];
  context.push(host.id,
    `这一场圆桌讨论「${context.informationPackage.title}」。每位先提出一个观察角度，再回应另一位留下的问题。${ROLE_DISCLOSURE}先听共同的起点：${quoteMaterial(opening)}`,
    "主持开场与分工", [opening]);
  const startingMaterials = panelists.map((speaker, index) => {
    const material = context.takeMaterial();
    const focus = PANEL_FOCUSES[index];
    context.push(speaker.id,
      `我承担“${focus.label}”这个 AI 演绎的讨论视角。${quoteMaterial(material)}我的开场问题是：${focus.question}？这是供大家检验的问题，我不把这个视角归给资料作者。`,
      `逐人开场：${focus.label}`, [material]);
    return material;
  });

  let last = startingMaterials.at(-1)!;
  panelists.forEach((speaker, index) => {
    const otherIndex = (index + panelists.length - 1) % panelists.length;
    const other = panelists[otherIndex];
    const previous = startingMaterials[otherIndex];
    const material = context.takeMaterial();
    const focus = PANEL_FOCUSES[index];
    const comparison = material.key === previous.key
      ? `我们先共同保留这一段：${quoteMaterial(material)}`
      : `你开场引用的是：${quoteMaterial(previous)}再对照这一段：${quoteMaterial(material)}`;
    context.push(speaker.id,
      `我接${other.name}开场的问题。${comparison}从“${focus.label}”看，我想补问：${focus.question}？我先把这个疑问交还给大家，不假定材料之间存在已经证实的因果关系。`,
      `交叉回应：接${other.name}`, [previous, material]);
    last = material;
  });

  let next = 0;
  while (context.hasMoreMaterials() && context.turns.length + 1 + 1 <= context.ceiling) {
    const speaker = panelists[next % panelists.length];
    const other = panelists[(next + panelists.length - 1) % panelists.length];
    const material = context.takeMaterial();
    context.push(speaker.id,
      `继续接${other.name}刚才留下的核对问题。上一段是：${quoteMaterial(last)}这一段是：${quoteMaterial(material)}我的回应是先保留两段各自的完整语境，再核对它们能否相互支持、是否存在尚未处理的限定；这里不替材料补出答案。`,
      `继续交叉回应：接${other.name}`, [last, material]);
    last = material;
    next += 1;
  }
  context.push(host.id,
    `圆桌收到这里，大家分别留下了定义、依据或行动条件上的问题。最后核对：${quoteMaterial(last)}这些问题尚待审阅，不视为已经形成共识；同名角色的发言也不代表资料作者本人。`,
    "主持收束", [last]);
  return context.finish();
}

export const DebateOrchestrator = { name: "DebateOrchestrator", promptVersion: "debate-deterministic-v1", model: "deterministic-stub", run: orchestrateDebate };
export const RoundtableOrchestrator = { name: "RoundtableOrchestrator", promptVersion: "roundtable-deterministic-v1", model: "deterministic-stub", run: orchestrateRoundtable };

export function runPodcastOrchestration(raw: unknown, options: PodcastOrchestrationOptions = {}): DialogueScript {
  const request = OrchestrationRequestSchema.parse(raw);
  if (!request.package) throw new Error("请在编排请求里带上信息包内容，暂不支持仅凭信息包 id 查询");
  if (request.packageId && request.packageId !== request.package.id) throw new Error("信息包 id 与内容不一致，请核对后重试");
  if (request.form === "interview") return orchestrateInterview(request.package, request.constraints, options);
  if (request.form === "debate") return orchestrateDebate(request.package, request.constraints, options);
  return orchestrateRoundtable(request.package, request.constraints, options);
}
