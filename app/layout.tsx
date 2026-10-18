import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

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
            <span>One question. Many voices.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
