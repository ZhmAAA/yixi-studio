"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; short: string; active: boolean };

export function SiteChrome({ featuredHref, createEnabled }: { featuredHref?: string; createEnabled: boolean }) {
  const pathname = usePathname();
  const studio = pathname === "/studio" || pathname.startsWith("/studio/");
  const createLabel = createEnabled ? "开一席" : "预约开一席";
  const publicItems: NavItem[] = [
    { href: "/topics", label: "问题", short: "问题", active: pathname.startsWith("/topics") },
    { href: "/people", label: "人物", short: "人物", active: pathname.startsWith("/people") }
  ];
  if (featuredHref) {
    publicItems.push({
      href: featuredHref,
      label: "精选一席",
      short: "精选",
      active: pathname.startsWith("/episodes/")
    });
  }

  const studioItems: NavItem[] = [
    { href: "/studio", label: "对谈队列", short: "队列", active: pathname === "/studio" },
    { href: "/studio/new", label: "新建一席", short: "新建", active: pathname.startsWith("/studio/new") },
    { href: "/", label: "公开站", short: "公开", active: false }
  ];
  const items = studio ? studioItems : publicItems;

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link href={studio ? "/studio" : "/"} className="brand" aria-label={studio ? "一席话工作台" : "一席话首页"}>
            <span className="brand-name">一席话</span>
            <span className="brand-en">{studio ? "Studio" : "Hear Them Out"}</span>
          </Link>
          <nav className="main-nav" aria-label={studio ? "工作台导航" : "主导航"}>
            {studio && (pathname.startsWith("/studio/episodes") || pathname.startsWith("/studio/new")) ? (
              <Link href="/studio">返回队列</Link>
            ) : (
              items.filter((item) => item.href !== "/studio/new").map((item) => (
                <Link href={item.href} className={item.active ? "is-active" : undefined} aria-current={item.active ? "page" : undefined} key={item.href}>
                  {item.label}
                </Link>
              ))
            )}
          </nav>
          {studio ? (
            pathname === "/studio" ? <Link href="/studio/new" className="button button-dark header-cta">新建一席</Link> : null
          ) : (
            <Link href="/create" className="button button-ghost header-cta" aria-current={pathname.startsWith("/create") ? "page" : undefined}>
              {createLabel}
            </Link>
          )}
        </div>
      </header>
      <nav className="mobile-nav" aria-label={studio ? "工作台移动导航" : "移动导航"}>
        {items.map((item) => (
          <Link href={item.href} className={item.active ? "is-active" : undefined} aria-current={item.active ? "page" : undefined} key={item.href}>
            {item.short}
          </Link>
        ))}
        {studio ? null : (
          <Link href="/create" className={pathname.startsWith("/create") ? "is-active" : undefined} aria-current={pathname.startsWith("/create") ? "page" : undefined}>
            预约
          </Link>
        )}
      </nav>
    </>
  );
}
