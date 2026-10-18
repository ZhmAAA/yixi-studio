import Link from "next/link";
import { notFound } from "next/navigation";
import { getPeopleByIds, getSourcesByIds } from "@/lib/content";
import { getEpisodeRecord } from "@/server/repositories/episode-repository";

export default async function EpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const episode = getEpisodeRecord(id);
  if (!episode) notFound();
  const episodePeople = getPeopleByIds(episode.personIds);
  const episodeSources = getSourcesByIds(episode.turns.flatMap((turn) => turn.citationIds));

  return (
    <div className="container">
      <section className="page-intro">
        <span className="kicker">An episode from 一席话</span>
        <h1>{episode.title}</h1>
        <p>{episode.question}</p>
        <div className="tag-row">
          <span className="tag">{episode.combinationType}</span>
          <span className="tag">{episode.format}</span>
          <span className="tag">{episode.duration}</span>
        </div>
        <div className="hero-actions">
          <Link href="/create" className="button button-dark">从这里再开一席</Link>
          <button className="button button-light" type="button">分享</button>
        </div>
      </section>
      <div className="detail-layout">
        <div className="detail-main">
          <section className="card">
            <h2>入席人物</h2>
            <div className="grid">{episodePeople.map((person) => <div className="person-card" key={person.id}><div className="avatar">{person.shortName}</div><div><strong>{person.displayName}</strong><p>{person.role}</p></div></div>)}</div>
          </section>
          <section className="card">
            <h2>把话说完</h2>
            <div className="dialogue">{episode.turns.map((turn) => {
              const person = episodePeople.find((candidate) => candidate.id === turn.speakerId);
              return <div className="turn" key={turn.sequence}><div className="turn-avatar">{person?.shortName}</div><div className="turn-body"><strong>{person?.displayName}</strong><p>{turn.text}</p><span className="provenance">{turn.provenance} · 已关联来源 {turn.citationIds.length} 条</span></div></div>;
            })}</div>
          </section>
          <div className="notice">{episode.disclosure}</div>
        </div>
        <aside className="detail-aside">
          <section className="card">
            <h3>本席资料</h3>
            <ul className="source-list">{episodeSources.map((source) => <li key={source.id}><strong>{source.title}</strong><span className="muted">{source.publisher} · {source.evidenceLevel}</span><a href={source.url} target="_blank" rel="noreferrer">查看来源</a></li>)}</ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
