"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { StudioPodcastScript } from "@/components/studio-podcast-script";
import type { CollectedBy, PodcastDraft } from "@/server/podcast/contracts";

export type PodcastDraftSummary = {
  id: string;
  title: string;
  turns: number;
  updatedAt: string;
};

const collectedOptions: Array<{ value: "" | CollectedBy; label: string }> = [
  { value: "", label: "按进料标注，否则算用户搜集" },
  { value: "user", label: "用户搜集" },
  { value: "ai", label: "AI 搜集" },
  { value: "mixed", label: "用户与 AI" }
];

export function StudioPodcastWorkbench({ recent }: { recent: PodcastDraftSummary[] }) {
  const [feedText, setFeedText] = useState("");
  const [title, setTitle] = useState("");
  const [hostName, setHostName] = useState("");
  const [guestName, setGuestName] = useState("");
  const [collectedBy, setCollectedBy] = useState<"" | CollectedBy>("");
  const [draft, setDraft] = useState<PodcastDraft | null>(null);
  const [saved, setSaved] = useState(recent);
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  function onFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFeedText(typeof reader.result === "string" ? reader.result : "");
      setError("");
    };
    reader.onerror = () => setError("读不了这个文件，请改成 txt 或 md。");
    reader.readAsText(file);
  }

  async function runInterview() {
    setIsRunning(true);
    setError("");
    try {
      const response = await fetch("/api/studio/podcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedText,
          title: title.trim() || undefined,
          hostName: hostName.trim() || undefined,
          guestNames: guestName.trim() ? [guestName.trim()] : undefined,
          collectedBy: collectedBy || undefined
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "无法编排访谈稿");
      const next = payload.data as PodcastDraft;
      setDraft(next);
      setSaved((current) => [
        { id: next.id, title: next.title, turns: next.script.turns.length, updatedAt: next.updatedAt },
        ...current.filter((item) => item.id !== next.id)
      ]);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ block: "start" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "无法编排访谈稿");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <>
      <section className="card podcast-form">
        <div className="form-step">
          <h3><span className="step-number">1</span>放入进料</h3>
          <p className="form-help">粘贴用户搜集或 AI 搜集的材料。可用「标题：」「话题：」「角色：主持：姓名；嘉宾：姓名」「来源：」「笔记：」分行。不写标签时，段落会直接成为来源。</p>
          <label className="editor-field">
            <span>进料正文</span>
            <textarea
              className="textarea podcast-feed"
              value={feedText}
              placeholder={"标题：夜间的老街\n话题：城市更新、居住\n角色：主持：林夏；嘉宾：陈默\n\n来源：居委会纪要\n过去三年，这条街的铺面换了四轮。住户最在意的不是招牌，而是夜里还能不能回家。\n\n笔记：\n夜间施工被投诉 27 次，主要集中在周三和周五。"}
              onChange={(event) => setFeedText(event.target.value)}
            />
          </label>
          <label className="editor-field">
            <span>或上传 txt / md</span>
            <input
              className="input"
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              onChange={(event) => onFile(event.target.files?.[0])}
            />
          </label>
        </div>
        <div className="form-step">
          <h3><span className="step-number">2</span>访谈设置</h3>
          <div className="grid">
            <label className="editor-field">
              <span>标题（可空）</span>
              <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="留空则从进料取" />
            </label>
            <label className="editor-field">
              <span>材料从哪来</span>
              <select className="select" value={collectedBy} onChange={(event) => setCollectedBy(event.target.value as "" | CollectedBy)}>
                {collectedOptions.map((option) => <option value={option.value} key={option.label}>{option.label}</option>)}
              </select>
            </label>
            <label className="editor-field">
              <span>主持人（可空）</span>
              <input className="input" value={hostName} onChange={(event) => setHostName(event.target.value)} placeholder="留空则用角色行或「主持人」" />
            </label>
            <label className="editor-field">
              <span>嘉宾（可空）</span>
              <input className="input" value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="留空则用角色行或「嘉宾」" />
            </label>
          </div>
          <p className="form-help">这一版只编排访谈。辩论和圆桌留在请求类型里，还不能跑。</p>
        </div>
        {error ? <div className="notice notice-error">{error}</div> : null}
        <button className="button button-dark" type="button" onClick={runInterview} disabled={isRunning || feedText.trim().length < 20}>
          {isRunning ? "编排中…" : "编排访谈稿"}
        </button>
      </section>

      <div ref={resultRef}>{draft ? <StudioPodcastScript draft={draft} /> : null}</div>

      <section>
        <div className="section-header">
          <div>
            <h2>已保存的访谈草稿</h2>
          </div>
        </div>
        <div className="studio-list">
          {saved.length ? saved.map((item) => (
            <Link href={`/studio/podcast/${item.id}`} className="studio-row" key={item.id}>
              <div>
                <span className="status draft">访谈草稿</span>
                <h3>{item.title}</h3>
              </div>
              <div className="studio-row-meta">
                <span>{item.turns} 轮</span>
                <span>{item.updatedAt.slice(0, 16).replace("T", " ")}</span>
                <span className="go">查看 →</span>
              </div>
            </Link>
          )) : <p className="empty-state">还没有访谈草稿。</p>}
        </div>
      </section>
    </>
  );
}
