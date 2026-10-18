import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLinkButton } from "@/components/copy-link-button";
import { getPeopleByIds, getSourcesByIds, type Turn } from "@/lib/content";
import { FIXED_DISCLOSURE } from "@/lib/disclaimer";
import { isPublicCreateEnabled } from "@/lib/studio-auth";
import { isRequestAuthorized } from "@/lib/studio-request-auth";
import { getEpisodeRecord } from "@/server/repositories/episode-repository";

const badgeClass: Record<Turn["provenance"], string> = {
  观点摘要: "badge badge-summary",
  事实背景: "badge badge-fact",
  合成演绎: "badge badge-synth"
};

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
  const episodeSources = getSourcesByIds([...new Set(episode.turns.flatMap((turn) => turn.citationIds))]);
  const extraDisclosure = episode.disclosure.trim() && episode.disclosure.trim() !== FIXED_DISCLOSURE ? episode.disclosure : "";

  return (
    <div className="container">
      <section className="page-intro">
        <span className="eyebrow">一席对谈</span>
        <h1>{episode.title}</h1>
        <p className="lede">{episode.question}</p>
        <div className="tag-row">
          <span className="tag">{episode.combinationType}</span>
          <span className="tag">{episode.format}</span>
          <span className="tag">{episode.duration}</span>
        </div>
        {episode.status !== "published" ? <div className="notice">这一席尚未发布，只有登录后的编辑部能预览。</div> : null}
        <div className="hero-actions">
          <Link href="/topics" className="button button-ghost">浏览问题</Link>
          <Link href="/create" className="button button-ghost">{isPublicCreateEnabled() ? "再开一席" : "预约开一席"}</Link>
          <CopyLinkButton />
        </div>
      </section>
      <div className="detail-layout">
        <div className="detail-main read-col">
          <section>
            <h2 className="section-label">入席人物</h2>
            <div className="guests">
              {episodePeople.map((person) => (
                <Link href={`/people/${person.slug}`} className="guest" key={person.id}>
                  <div className="avatar">{person.shortName}</div>
                  <div>
                    <strong>{person.displayName}</strong>
                    <p className="meta">{person.role}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
          <section>
            <h2 className="section-label">把话说完</h2>
            <div className="dialogue">
              {episode.turns.map((turn) => {
                const person = episodePeople.find((candidate) => candidate.id === turn.speakerId);
                const note = turn.provenance === "合成演绎"
                  ? "非真实引语 · 基于公开思想脉络整理"
                  : `已关联来源 ${turn.citationIds.length} 条`;
                return (
                  <article className="turn" key={turn.sequence}>
                    <div className="avatar turn-avatar">{person?.shortName}</div>
                    <div className="bubble">
                      <div className="who">{person?.displayName}</div>
                      <p className="text">{turn.text}</p>
                      <div className="foot">
                        <span className={badgeClass[turn.provenance]}>{turn.provenance}</span>
                        <span className="meta">{note}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="disclosure">
              <strong>声明</strong>
              {FIXED_DISCLOSURE}{extraDisclosure ? ` ${extraDisclosure}` : ""}
            </div>
          </section>
        </div>
        <aside className="detail-aside">
          <section className="card">
            <h3>本席资料</h3>
            {episodeSources.length ? (
              <ul className="source-list">{episodeSources.map((source) => <li key={source.id}><strong>{source.title}</strong><span className="muted">{source.publisher} · {source.evidenceLevel}</span><a href={source.url} target="_blank" rel="noreferrer">查看来源</a></li>)}</ul>
            ) : (
              <p className="prose">本席暂无外链来源，请以声明为准。</p>
            )}
          </section>
          <section className="card">
            <h3>阅读提示</h3>
            <p className="prose">标为「合成演绎」的句子不是引语。事实背景与观点摘要应能在来源中找到依据。</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
