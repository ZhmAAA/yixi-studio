import Link from "next/link";
import { notFound } from "next/navigation";
import { getPerson, getSourcesByIds, topics } from "@/lib/content";
import { ContentCard } from "@/components/content-card";

export default async function PersonDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const person = getPerson(slug);
  if (!person) notFound();
  const suitableTopics = topics.filter((topic) => person.suitableQuestionIds.includes(topic.id));
  const linkedSources = getSourcesByIds(person.sourceIds);

  return (
    <div className="container">
      <section className="page-intro">
        <span className={person.type === "hot" ? "eyebrow hot" : "eyebrow"}>{person.type === "hot" ? "热点人物" : "经典人物"}</span>
        <h1>{person.displayName}</h1>
        <p>{person.role} · {person.era}</p>
        <Link href="/create" className="button button-dark">让 TA 参与一席</Link>
      </section>
      <div className="detail-layout">
        <div className="detail-main">
          <section className="card">
            <h2>为什么邀请 TA？</h2>
            <p>{person.bio}</p>
            <p>{person.viewpointSummary}</p>
            <div className="tag-row">{person.keywords.map((keyword) => <span className="tag" key={keyword}>{keyword}</span>)}</div>
          </section>
          <section>
            <div className="section-header"><h2>适合聊的问题</h2></div>
            <div className="grid">{suitableTopics.map((topic) => <ContentCard topic={topic} key={topic.id} />)}</div>
          </section>
        </div>
        <aside className="detail-aside">
          <section className="card">
            <h3>资料来源</h3>
            <ul className="source-list">{linkedSources.map((source) => <li key={source.id}><strong>{source.title}</strong><span className="muted">{source.publisher}</span><a href={source.url} target="_blank" rel="noreferrer">打开来源</a></li>)}</ul>
          </section>
          <div className="notice">本页人物卡片用于策划 AI 对谈，不代表人物本人参与、认可或发表了页面中的任何言论。</div>
        </aside>
      </div>
    </div>
  );
}
