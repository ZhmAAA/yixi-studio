import Link from "next/link";
import type { Person } from "@/lib/content";

export function PersonCard({ person }: { person: Person }) {
  return (
    <article className="card person-card">
      <div className="avatar">{person.shortName}</div>
      <div>
        <div className="card-topline">
          <span className={person.type === "hot" ? "eyebrow hot" : "eyebrow"}>{person.type === "hot" ? "热点人物" : "经典人物"}</span>
          <span className="muted">{person.era}</span>
        </div>
        <h3>{person.displayName}</h3>
        <p className="person-role">{person.role}</p>
        <p>{person.viewpointSummary}</p>
        <Link href={`/people/${person.slug}`} className="text-link">听 TA 谈什么 →</Link>
      </div>
    </article>
  );
}
