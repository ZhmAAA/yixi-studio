import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { FIXED_DISCLOSURE } from "@/lib/disclaimer";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "一席话 | Hear Them Out",
  description: "听你想听的人，把话说完。"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <footer className="site-footer">
          <div className="container footer-inner">
            <span>一席话 · Hear Them Out</span>
            <Link href="/disclaimer">关于与免责</Link>
            <p className="footer-disclosure">{FIXED_DISCLOSURE}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
