"use client";

import { useState } from "react";
import Link from "next/link";
import { FIXED_DISCLOSURE } from "@/lib/disclaimer";

export function CreateClosedPanel() {
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [message, setMessage] = useState("");

  async function reserve(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = `我想预约开一席\n联系方式：${email}\n想聊的问题：${question}`;
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
        <span className="kicker">Waitlist</span>
        <h1>开一席 · 即将对读者开放</h1>
        <p>首发阶段由编辑部策划并审核后发布。公开生成尚未开放。可以留下想聊的问题，或先阅读已发布的一席。</p>
      </section>
      <section className="card form-card">
        <form onSubmit={reserve}>
          <label className="editor-field">联系方式
            <input className="input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          </label>
          <label className="editor-field" style={{ marginTop: 16 }}>我感兴趣的问题
            <textarea className="textarea" required value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="想听谁谈什么？" />
          </label>
          <p className="form-help">预约内容只会复制到剪贴板，不会写入服务器。</p>
          <button className="button button-dark" style={{ marginTop: 16 }} type="submit">复制预约内容</button>
        </form>
        {message ? <div className="notice" style={{ marginTop: 16 }}>{message}</div> : null}
        <div className="hero-actions">
          <Link href="/topics" className="button button-light">去问题库</Link>
          <Link href="/" className="button button-light">回首页</Link>
        </div>
        <div className="notice" style={{ marginTop: 16 }}>{FIXED_DISCLOSURE}</div>
      </section>
    </div>
  );
}
