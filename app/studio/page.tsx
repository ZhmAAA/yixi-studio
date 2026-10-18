import Link from "next/link";
import { episodes, people, sources, topics } from "@/lib/content";
import { getEpisodeRecord } from "@/server/repositories/episode-repository";

const statusLabel = {
  draft: "草稿",
  review: "待审核",
  published: "已发布",
  pending: "待整理",
  generating: "生成中",
  failed: "生成失败"
} as const;

export default function StudioPage() {
  const stats = [
    ["问题", topics.length],
    ["人物", people.length],
    ["来源", sources.length],
    ["对谈", episodes.length]
  ];
  const records = episodes.map((episode) => getEpisodeRecord(episode.id)).filter(Boolean);

  return (
    <div className="container">
      <section className="page-intro studio-heading">
        <div>
          <span className="kicker">Yixi Studio</span>
          <h1>内容工作台</h1>
          <p>先把问题、人物、来源和对谈稿编辑成一席，再交给审核和发布。</p>
        </div>
        <Link href="/studio/new" className="button button-dark">新建一席</Link>
      </section>

      <section className="grid three">
        {stats.map(([label, value]) => <div className="studio-stat" key={label as string}><strong>{value}</strong><span>{label}</span></div>)}
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <span className="kicker">Editorial queue</span>
            <h2>对谈内容</h2>
          </div>
          <p>第一期先支持手工录入和逐轮审核，模型生成只作为草稿建议。</p>
        </div>
        <div className="studio-list">
          {records.map((episode) => episode ? (
            <Link href={`/studio/episodes/${episode.id}`} className="studio-row" key={episode.id}>
              <div>
                <span className="eyebrow">{statusLabel[episode.status]}</span>
                <h3>{episode.title}</h3>
                <p>{episode.question}</p>
              </div>
              <div className="studio-row-meta">
                <span>{episode.personIds.length} 位人物</span>
                <span>{episode.turns.length} 轮</span>
                <span>编辑 →</span>
              </div>
            </Link>
          ) : null)}
        </div>
      </section>

      <section className="section studio-next">
        <div className="card">
          <h3>第一期录入顺序</h3>
          <p>先确定一个问题，再核对人物卡和来源，最后逐轮录入对谈。每一轮都要标明是观点摘要、事实背景还是合成演绎。</p>
          <div className="tag-row">
            <span className="tag">问题</span>
            <span className="tag">人物</span>
            <span className="tag">来源</span>
            <span className="tag">对谈</span>
            <span className="tag">审核</span>
          </div>
        </div>
      </section>
    </div>
  );
}
