import Link from "next/link";
import { people, sources, topics, episodes } from "@/lib/content";

export default function StudioPage() {
  const stats = [
    ["问题", topics.length],
    ["人物", people.length],
    ["来源", sources.length],
    ["已发布一席", episodes.length]
  ];

  return (
    <div className="container">
      <section className="page-intro">
        <span className="kicker">Yixi Studio</span>
        <h1>内容工作台</h1>
        <p>这里是编辑团队维护问题、人物、来源和节目策划单的入口。正式版需要接入登录和审核权限。</p>
      </section>
      <section className="grid three">
        {stats.map(([label, value]) => <div className="studio-stat" key={label as string}><strong>{value}</strong><span>{label}</span></div>)}
      </section>
      <section className="section">
        <div className="card">
          <h3>下一步工作</h3>
          <p>为热点内容补充来源快照和失效策略，为经典内容补充出处、时代背景与复核记录，再进入发布审核。</p>
          <Link href="/create" className="text-link">预览用户端开一席 →</Link>
        </div>
      </section>
    </div>
  );
}
