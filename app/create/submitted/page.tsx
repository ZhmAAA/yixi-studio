import Link from "next/link";
import { isRequestAuthorized } from "@/lib/studio-request-auth";

export default async function CreateSubmittedPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const safeId = id && /^[\w-]+$/.test(id) ? id : undefined;
  const authorized = await isRequestAuthorized();

  return (
    <div className="container">
      <section className="page-intro">
        <span className="kicker">草稿</span>
        <h1>草稿已留下</h1>
        <p>这一席还不会公开。编辑部审核并发布之后，才会出现在首页和阅读页。</p>
        <div className="hero-actions">
          {authorized && safeId ? <Link href={`/studio/episodes/${safeId}`} className="button button-dark">在工作台继续编辑</Link> : null}
          <Link href="/" className="button button-light">回首页</Link>
        </div>
      </section>
    </div>
  );
}
