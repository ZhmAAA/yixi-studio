import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import localFont from "next/font/local";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { FIXED_DISCLOSURE } from "@/lib/disclaimer";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-source-sans"
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-source-serif"
});

const notoSerif = localFont({
  src: [
    { path: "./fonts/NotoSerifSC-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/NotoSerifSC-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/NotoSerifSC-700.woff2", weight: "700", style: "normal" }
  ],
  display: "swap",
  variable: "--font-noto-serif",
  adjustFontFallback: "Arial"
});

const notoSans = localFont({
  src: [
    { path: "./fonts/NotoSansSC-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/NotoSansSC-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/NotoSansSC-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/NotoSansSC-700.woff2", weight: "700", style: "normal" }
  ],
  display: "swap",
  variable: "--font-noto-sans",
  adjustFontFallback: "Arial"
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "一席话 | Hear Them Out",
  description: "从一个问题出发，听不同的人把话说完。编辑部审核后发布，可阅读，有来源。"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${sourceSans.variable} ${sourceSerif.variable} ${notoSerif.variable} ${notoSans.variable}`}>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <footer className="site-footer">
          <div className="container footer-inner">
            <div className="footer-row">
              <span>一席话 · Hear Them Out</span>
              <Link href="/disclaimer">关于与免责</Link>
            </div>
            <p className="footer-disclosure">{FIXED_DISCLOSURE}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
