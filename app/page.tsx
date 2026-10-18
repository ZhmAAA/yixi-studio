import Link from "next/link";
import { ContentCard } from "@/components/content-card";
import { PersonCard } from "@/components/person-card";
import { getPeopleByIds, people, topics } from "@/lib/content";
import { listPublishedEpisodes } from "@/server/repositories/episode-repository";

export default async function HomePage() {
  const hotTopics = topics.filter((topic) => topic.type === "hot");
  const classicTopics = topics.filter((topic) => topic.type === "classic");
  const featuredPeople = people.slice(0, 3);
  const published = await listPublishedEpisodes();
  const featured = published[0];
  const counts = new Map<string, number>();
  for (const episode of published) counts.set(episode.topicId, (counts.get(episode.topicId) ?? 0) + 1);
  const featuredNames = featured ? getPeopleByIds(featured.personIds).map((person) => person.displayName).join(" × ") : "";

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="kicker">一个问题，多种声音</span>
            <h1>今天，听谁谈什么？</h1>
            <p className="lede">从一个问题出发，听不同的人把话说完。热点与经典人物，围绕热点与经典问题，展开一席有来源的对谈。</p>
            <div className="hero-actions">
              {featured ? <Link href={`/episodes/${featured.id}`} className="button button-dark">先听一席</Link> : null}
              <Link href="/topics" className="link-quiet">浏览问题</Link>
            </div>
          </div>
          <aside className="hero-note">
            <strong>何为一席话</strong>
            <p>我们把公开资料、人物观点与编辑策划放在一起，做成一场可阅读、有来源的 AI 对谈。首发由编辑部审核后发布——不是空白对话框，也不是即时表演。</p>
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>今日热点</h2>
            <p>从正在发生的问题出发，听不同的视角轻轻碰一碰。</p>
          </div>
          <div className="grid">{hotTopics.map((topic) => <ContentCard topic={topic} publishedCount={counts.get(topic.id) ?? 0} key={topic.id} />)}</div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>经典再聊</h2>
            <p>有些问题没有过期，只是在每个时代被重新问一次。</p>
          </div>
          <div className="grid">{classicTopics.map((topic) => <ContentCard topic={topic} publishedCount={counts.get(topic.id) ?? 0} key={topic.id} />)}</div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>听谁来谈</h2>
            <Link href="/people" className="link-quiet">全部人物</Link>
          </div>
          <div className="grid three">{featuredPeople.map((person) => <PersonCard person={person} key={person.id} />)}</div>
          {featured ? (
            <div className="episode-banner">
              <div>
                <div className="band-kicker">精选一席</div>
                <h3>{featured.title}</h3>
                <p>{featuredNames} · {featured.combinationType} · {featured.duration}</p>
              </div>
              <Link href={`/episodes/${featured.id}`} className="button button-light">打开这席</Link>
            </div>
          ) : (
            <div className="empty-state">编辑部正在准备第一席。</div>
          )}
        </div>
      </section>
    </>
  );
}
