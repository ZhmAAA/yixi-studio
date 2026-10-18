import { getPeopleByIds, getTopic } from "@/lib/content";
import { EpisodeCreateInputSchema, EpisodeDraftSchema, type EpisodeCreateInput, type EpisodeDraft } from "@/server/contracts";

export function generateDialogueDraft(rawInput: EpisodeCreateInput): EpisodeDraft {
  const input = EpisodeCreateInputSchema.parse(rawInput);
  const topic = getTopicById(input.topicId);
  const people = getPeopleByIds(input.personIds);

  if (people.length < 2) {
    throw new Error("至少需要两位入席人物");
  }

  const [first, second] = people;
  const firstCitation = first.sourceIds[0] ?? topic.sourceIds[0];
  const secondCitation = second.sourceIds[0] ?? topic.sourceIds[0];

  const draft = {
    title: `${topic.title.slice(0, 18)}：${first.displayName} × ${second.displayName}`,
    question: topic.title,
    topicId: topic.id,
    personIds: people.map((person) => person.id),
    format: input.format,
    duration: input.duration,
    combinationType: `${topic.type === "hot" ? "热点问题" : "经典问题"} × ${people.map((person) => person.type === "hot" ? "热点人物" : "经典人物").join(" + ")}`,
    disclosure: "本内容基于公开资料的 AI 演绎，非本人发言，不代表本人观点。",
    turns: [
      {
        sequence: 1,
        speakerId: first.id,
        text: `如果从${first.displayName}的公开资料出发，这个问题首先要回到它的现实背景：${topic.background}`,
        provenance: "观点摘要" as const,
        citationIds: [firstCitation]
      },
      {
        sequence: 2,
        speakerId: second.id,
        text: `换一个角度看，${topic.tensionPoints[0] ?? "我们还需要追问这项选择会改变什么"}。真正的讨论，不应该只停留在更快或更慢。`,
        provenance: "合成演绎" as const,
        citationIds: [secondCitation]
      },
      {
        sequence: 3,
        speakerId: first.id,
        text: `所以我们可以把问题再具体一点：哪些判断可以交给工具，哪些责任仍然必须由人承担？`,
        provenance: "合成演绎" as const,
        citationIds: [firstCitation, topic.sourceIds[0]]
      },
      {
        sequence: 4,
        speakerId: second.id,
        text: "如果不同意见没有被认真听见，答案即使更有效率，也未必更接近我们真正想要的生活。",
        provenance: "合成演绎" as const,
        citationIds: [secondCitation]
      }
    ]
  };

  return EpisodeDraftSchema.parse(draft);
}

function getTopicById(id: string) {
  const topic = getTopic(id);
  if (topic) return topic;
  throw new Error("找不到对应问题");
}
