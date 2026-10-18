import Link from "next/link";
import type { Topic } from "@/lib/content";

export function ContentCard({ topic }: { topic: Topic }) {
  return (
    <article className="card topic-card">
      <div className="card-topline">
        <span className={topic.type === "hot" ? "eyebrow hot" : "eyebrow"}>{topic.type === "hot" ? "热点问题" : "经典问题"}</span>
        <span className="muted">{topic.episodeCount} 席</span>
      </div>
      <h3>{topic.title}</h3>
      <p>{topic.summary}</p>
      <div className="tag-row">
        {topic.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
      </div>
      <Link href={`/topics/${topic.slug}`} className="text-link">查看问题 →</Link>
    </article>
  );
}
