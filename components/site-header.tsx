import Link from "next/link";
import { isPublicCreateEnabled } from "@/lib/studio-auth";
import { listPublishedEpisodes } from "@/server/repositories/episode-repository";

export async function SiteHeader() {
  const createEnabled = isPublicCreateEnabled();
  const featured = (await listPublishedEpisodes())[0];

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="一席话首页">
          <span className="brand-mark">一</span>
          <span>
            <strong>一席话</strong>
            <small>Hear Them Out</small>
          </span>
        </Link>
        <nav className="main-nav" aria-label="主导航">
          <Link href="/topics">问题</Link>
          <Link href="/people">人物</Link>
          {featured ? <Link href={`/episodes/${featured.id}`}>精选一席</Link> : null}
        </nav>
        <Link href="/create" className={createEnabled ? "button button-dark header-cta" : "button button-light header-cta"}>
          {createEnabled ? "开一席" : "预约开一席"}
        </Link>
      </div>
    </header>
  );
}
