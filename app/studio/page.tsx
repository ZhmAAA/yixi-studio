import { StudioLogout } from "@/components/studio-logout";
import { StudioQueue } from "@/components/studio-queue";
import { people, topics } from "@/lib/content";
import { listEpisodeRecords } from "@/server/repositories/episode-repository";

export default async function StudioPage() {
  const records = await listEpisodeRecords();
  const stats = [
    ["问题（种子库）", topics.length],
    ["人物（种子库）", people.length],
    ["对谈草稿与成稿", records.length]
  ] as const;

  return (
    <div className="container">
      <section className="page-intro studio-heading">
        <div>
          <span className="kicker">内容工作台</span>
          <h1>编辑部队列</h1>
          <p className="lede">把问题、人物、来源与对谈稿整理成一席，再交给审核与发布。问题与人物仍来自种子库，模型生成只作为草稿建议。</p>
        </div>
        <StudioLogout />
      </section>

      <section className="stats">
        {stats.map(([label, value]) => <div className="studio-stat" key={label}><strong>{value}</strong><span>{label}</span></div>)}
      </section>

      <StudioQueue items={records.map((episode) => ({
        id: episode.id,
        title: episode.title,
        question: episode.question,
        status: episode.status,
        people: episode.personIds.length,
        turns: episode.turns.length
      }))} />
    </div>
  );
}
