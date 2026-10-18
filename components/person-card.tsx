import Link from "next/link";
import type { Person } from "@/lib/content";

export function PersonCard({ person }: { person: Person }) {
  return (
    <article className="card person-card">
      <div className="avatar">{person.shortName}</div>
      <div>
        <h3>{person.displayName}</h3>
        <p className="person-role">{person.role} · {person.type === "hot" ? "热点人物" : "经典人物"}</p>
        <p>{person.viewpointSummary}</p>
        <Link href={`/people/${person.slug}`} className="card-go">查看人物 <span>→</span></Link>
      </div>
    </article>
  );
}
