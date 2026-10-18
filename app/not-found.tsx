import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container">
      <section className="page-intro">
        <span className="kicker">Not found</span>
        <h1>这席还没准备好。</h1>
        <p>换一个问题或人物试试，我们正在继续整理更多内容。</p>
        <Link href="/" className="button button-dark">回到首页</Link>
      </section>
    </div>
  );
}
