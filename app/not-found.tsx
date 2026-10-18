import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container">
      <section className="page-intro">
        <span className="kicker">Not found</span>
        <h1>没有找到这一页。</h1>
        <p>它可能还在编辑部，或已经下线。</p>
        <Link href="/" className="button button-dark">回到首页</Link>
      </section>
    </div>
  );
}
