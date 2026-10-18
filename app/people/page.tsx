import { PersonCard } from "@/components/person-card";
import { people } from "@/lib/content";

export default function PeoplePage() {
  return (
    <div className="container">
      <section className="page-intro">
        <span className="kicker">人物</span>
        <h1>听谁来谈？</h1>
        <p>热点人物带来正在发生的现场，经典人物带来被时间留下来的问题。我们只使用公开资料，不把页面文字写成本人发言。</p>
      </section>
      <section className="section">
        <div className="grid">{people.map((person) => <PersonCard person={person} key={person.id} />)}</div>
      </section>
    </div>
  );
}
