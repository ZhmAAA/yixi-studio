import Link from "next/link";

export function SiteHeader() {
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
          <Link href="/episodes/ai-work-judgment">先听一席</Link>
        </nav>
        <Link href="/create" className="button button-dark header-cta">
          开一席
        </Link>
      </div>
    </header>
  );
}
