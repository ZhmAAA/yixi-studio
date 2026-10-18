import Link from "next/link";
import { ContentCard } from "@/components/content-card";
import { PersonCard } from "@/components/person-card";
import { episodes, people, topics } from "@/lib/content";

export default function HomePage() {
  const hotTopics = topics.filter((topic) => topic.type === "hot");
  const classicTopics = topics.filter((topic) => topic.type === "classic");
  const featuredPeople = people.slice(0, 3);
  const sampleEpisode = episodes[0];

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="kicker">One question. Many voices.</span>
            <h1>今天，听谁谈什么？</h1>
            <p className="lede">从一个问题出发，听不同的人把话说完。热点与经典人物，围绕热点与经典问题，展开一席有来源的对谈。</p>
            <div className="hero-actions">
              <Link href="/create" className="button button-dark">开一席</Link>
              <Link href={`/episodes/${sampleEpisode.id}`} className="button button-light">先听一席</Link>
            </div>
          </div>
          <aside className="hero-note">
            <strong>一席话是什么？</strong>
            <p>我们把公开资料、人物观点与编辑策划放在一起，生成一场可阅读、可收听、可分享的 AI 对谈。</p>
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>今日热点</h2>
            <p>从正在发生的问题出发，听不同的视角碰一碰。</p>
          </div>
          <div className="grid">{hotTopics.map((topic) => <ContentCard topic={topic} key={topic.id} />)}</div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>经典再聊</h2>
            <p>有些问题没有过期，只是在每个时代重新问一次。</p>
          </div>
          <div className="grid">{classicTopics.map((topic) => <ContentCard topic={topic} key={topic.id} />)}</div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>听谁来谈？</h2>
            <Link href="/people" className="text-link">看全部人物 →</Link>
          </div>
          <div className="grid three">{featuredPeople.map((person) => <PersonCard person={person} key={person.id} />)}</div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="episode-banner">
            <div>
              <strong>{sampleEpisode.title}</strong>
              <p>{sampleEpisode.combinationType} · {sampleEpisode.duration}</p>
            </div>
            <Link href={`/episodes/${sampleEpisode.id}`} className="button button-light">打开这席</Link>
          </div>
        </div>
      </section>
    </>
  );
}
