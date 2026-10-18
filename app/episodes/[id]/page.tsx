import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPeopleByIds, getSourcesByIds } from "@/lib/content";
import { FIXED_DISCLOSURE } from "@/lib/disclaimer";
import { isPublicCreateEnabled } from "@/lib/studio-auth";
import { isRequestAuthorized } from "@/lib/studio-request-auth";
import { getEpisodeRecord } from "@/server/repositories/episode-repository";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const episode = await getEpisodeRecord(id);
  if (!episode || episode.status !== "published") {
    return { robots: { index: false, follow: false } };
  }
  return { title: `${episode.title} | 一席话` };
}

export default async function EpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const episode = await getEpisodeRecord(id);
  const authorized = await isRequestAuthorized();
  if (!episode || (episode.status !== "published" && !authorized)) notFound();
  const episodePeople = getPeopleByIds(episode.personIds);
  const episodeSources = getSourcesByIds(episode.turns.flatMap((turn) => turn.citationIds));
  const extraDisclosure = episode.disclosure.trim() && episode.disclosure.trim() !== FIXED_DISCLOSURE ? episode.disclosure : "";

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
        {episode.status !== "published" ? <div className="notice">这一席尚未发布，只有登录后的编辑部能预览。</div> : null}
        <div className="hero-actions">
          <Link href="/topics" className="button button-dark">浏览问题</Link>
          <Link href="/create" className="button button-light">{isPublicCreateEnabled() ? "再开一席" : "预约开一席"}</Link>
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
          <div className="notice">{FIXED_DISCLOSURE}{extraDisclosure ? ` ${extraDisclosure}` : ""}</div>
        </div>
        <aside className="detail-aside">
          <section className="card">
            <h3>本席资料</h3>
            {episodeSources.length ? (
              <ul className="source-list">{episodeSources.map((source) => <li key={source.id}><strong>{source.title}</strong><span className="muted">{source.publisher} · {source.evidenceLevel}</span><a href={source.url} target="_blank" rel="noreferrer">查看来源</a></li>)}</ul>
            ) : (
              <p>本席暂无外链来源，请以声明为准。</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
