import Link from "next/link";
import { notFound } from "next/navigation";
import { getPeopleByIds, getSourcesByIds, getTopic } from "@/lib/content";
import { PersonCard } from "@/components/person-card";

export default async function TopicDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();
  const recommendedPeople = getPeopleByIds(topic.recommendedPersonIds);
  const linkedSources = getSourcesByIds(topic.sourceIds);

  return (
    <div className="container">
      <section className="page-intro">
        <span className={topic.type === "hot" ? "eyebrow hot" : "eyebrow"}>{topic.type === "hot" ? "热点问题" : "经典问题"}</span>
        <h1>{topic.title}</h1>
        <p>{topic.summary}</p>
        <Link href="/create" className="button button-dark">用这个问题开一席</Link>
      </section>
      <div className="detail-layout">
        <div className="detail-main">
          <section className="card">
            <h2>为什么现在聊？</h2>
            <p>{topic.background}</p>
            <div className="tag-row">{topic.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
          </section>
          <section className="card">
            <h2>讨论张力</h2>
            <ul className="source-list">{topic.tensionPoints.map((point) => <li key={point}>{point}</li>)}</ul>
          </section>
          <section>
            <div className="section-header"><h2>推荐入席</h2></div>
            <div className="grid">{recommendedPeople.map((person) => <PersonCard person={person} key={person.id} />)}</div>
          </section>
        </div>
        <aside className="detail-aside">
          <section className="card">
            <h3>内容信息</h3>
            <dl className="meta-list">
              <div><dt>类型</dt><dd>{topic.type === "hot" ? "热点问题" : "经典问题"}</dd></div>
              <div><dt>截至</dt><dd>{topic.asOfDate}</dd></div>
              {topic.expiresAt && <div><dt>复核</dt><dd>{topic.expiresAt}</dd></div>}
              <div><dt>已生成</dt><dd>{topic.episodeCount} 席</dd></div>
            </dl>
          </section>
          <section className="card">
            <h3>资料来源</h3>
            <ul className="source-list">{linkedSources.map((source) => <li key={source.id}><strong>{source.title}</strong><span className="muted">{source.publisher} · {source.evidenceLevel}</span><a href={source.url} target="_blank" rel="noreferrer">打开来源</a></li>)}</ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
