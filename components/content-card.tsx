import Link from "next/link";
import type { Topic } from "@/lib/content";

export function ContentCard({ topic, publishedCount = 0 }: { topic: Topic; publishedCount?: number }) {
  return (
    <article className="card">
      <div className="card-topline">
        <span className={topic.type === "hot" ? "eyebrow hot" : "eyebrow"}>{topic.type === "hot" ? "热点问题" : "经典问题"}</span>
        <span className="meta">{publishedCount > 0 ? `${publishedCount} 席已发布` : "筹备中"}</span>
      </div>
      <h3>{topic.title}</h3>
      <p>{topic.summary}</p>
      <div className="tag-row">
        {topic.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
      </div>
      <Link href={`/topics/${topic.slug}`} className="card-go">查看问题 <span>→</span></Link>
    </article>
  );
}
