import { ContentCard } from "@/components/content-card";
import { topics } from "@/lib/content";

export default function TopicsPage() {
  return (
    <div className="container">
      <section className="page-intro">
        <span className="kicker">Questions</span>
        <h1>你想听什么问题？</h1>
        <p>一个好问题，值得被不同的人认真回答。先从热点开始，也可以回到那些一直没有过期的经典问题。</p>
      </section>
      <section className="section">
        <div className="grid">{topics.map((topic) => <ContentCard topic={topic} key={topic.id} />)}</div>
      </section>
    </div>
  );
}
