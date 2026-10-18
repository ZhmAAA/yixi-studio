import Link from "next/link";
import { notFound } from "next/navigation";
import { PersonCard } from "@/components/person-card";
import { getPeopleByIds, getSourcesByIds, getTopic } from "@/lib/content";
import { isPublicCreateEnabled } from "@/lib/studio-auth";
import { listPublishedEpisodes } from "@/server/repositories/episode-repository";

export default async function TopicDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();
  const recommendedPeople = getPeopleByIds(topic.recommendedPersonIds);
  const linkedSources = getSourcesByIds(topic.sourceIds);
  const published = (await listPublishedEpisodes()).filter((episode) => episode.topicId === topic.id);
  const primary = published[0];
  const createLabel = isPublicCreateEnabled() ? "用这个问题开一席" : primary ? "预约用这个问题开一席" : "预约开一席";

  return (
    <div className="container">
      <section className="page-intro">
        <span className={topic.type === "hot" ? "eyebrow hot" : "eyebrow"}>{topic.type === "hot" ? "热点问题" : "经典问题"}</span>
        <h1>{topic.title}</h1>
        <p className="lede">{topic.summary}</p>
        <div className="hero-actions">
          {primary ? <Link href={`/episodes/${primary.id}`} className="button button-dark">阅读这一席</Link> : null}
          <Link href="/create" className={primary ? "button button-ghost" : "button button-dark"}>{createLabel}</Link>
        </div>
      </section>
      <div className="detail-layout">
        <div className="detail-main">
          <section className="card">
            <h2>为什么现在聊</h2>
            <p className="prose">{topic.background}</p>
            <div className="tag-row">{topic.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
          </section>
          <section className="card">
            <h2>讨论张力</h2>
            <ul className="tension">{topic.tensionPoints.map((point) => <li key={point}>{point}</li>)}</ul>
          </section>
          <section className="card">
            <h2>相关一席</h2>
            {published.length ? published.map((episode) => (
              <Link href={`/episodes/${episode.id}`} className="related-row" key={episode.id}>
                <div>
                  <span className="status">已发布</span>
                  <h4>{episode.title}</h4>
                  <p className="meta">{episode.combinationType} · {episode.duration}</p>
                </div>
                <span className="card-go">阅读 <span>→</span></span>
              </Link>
            )) : <p className="muted">这一问还在筹备。</p>}
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
              <div><dt>资料截至</dt><dd>{topic.asOfDate}</dd></div>
              {topic.expiresAt ? <div><dt>计划复核</dt><dd>{topic.expiresAt}</dd></div> : null}
              <div><dt>已发布</dt><dd>{published.length} 席</dd></div>
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
