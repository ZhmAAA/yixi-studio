"use client";

import { useState } from "react";
import Link from "next/link";
import { FIXED_DISCLOSURE } from "@/lib/disclaimer";

export function CreateClosedPanel({ featuredHref }: { featuredHref?: string }) {
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [message, setMessage] = useState("");

  async function reserve(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = `我想预约开一席\n联系方式：${email}\n想聊的问题：${question || "（未填写）"}`;
    try {
      await navigator.clipboard.writeText(text);
      setMessage("已复制预约内容。服务器不会保存这段话，你可以把它发给编辑部。");
    } catch {
      setMessage(text);
    }
  }

  return (
    <div className="container">
      <section className="page-intro">
        <span className="eyebrow">开一席</span>
        <h1>即将对读者开放</h1>
        <p className="lede">首发阶段由编辑部策划并审核后发布。我们更在意每一席的来源与边界，而不是让任何人立刻生成一段像谁说的话。</p>
      </section>
      <section className="wait-card">
        <form onSubmit={reserve}>
          <div className="notice">当前以阅读已发布对谈为主。内测开放时，你可以从问题库选一个问题、请两位人物入席——仍会标明 AI 演绎边界。</div>
          <label className="field">邮箱
            <input className="input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="用于内测通知" />
          </label>
          <label className="field">你想听的问题（可选）
            <textarea className="textarea" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例如：平台推荐与公共责任" />
          </label>
          <p className="hint">留下联系方式即可。预约内容只复制到剪贴板，不会写入服务器。</p>
          <button className="button button-dark button-block" type="submit">预约内测</button>
        </form>
        {message ? <div className="notice" style={{ marginTop: 16 }}>{message}</div> : null}
        <div className="wait-links">
          {featuredHref ? <Link href={featuredHref} className="link-quiet">先听一席已发布对谈</Link> : null}
          <Link href="/topics" className="link-quiet">去问题库</Link>
        </div>
        <div className="disclosure">{FIXED_DISCLOSURE}</div>
      </section>
    </div>
  );
}
