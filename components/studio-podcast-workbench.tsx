"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { StudioPodcastScript } from "@/components/studio-podcast-script";
import { PODCAST_FORM_LABELS } from "@/lib/podcast-forms";
import type { CollectedBy, PodcastDraft, PodcastForm } from "@/server/podcast/contracts";

export type PodcastDraftSummary = {
  id: string;
  title: string;
  form: PodcastForm;
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
  const [guestNames, setGuestNames] = useState("");
  const [form, setForm] = useState<PodcastForm>("interview");
  const formLabel = PODCAST_FORM_LABELS[form];
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

  async function runDialogue() {
    setIsRunning(true);
    setError("");
    setDraft(null);
    try {
      const response = await fetch("/api/studio/podcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedText,
          form,
          title: title.trim() || undefined,
          hostName: hostName.trim() || undefined,
          guestNames: guestNames.trim() ? guestNames.split(/[、,，;；\n]+/).map((name) => name.trim()).filter(Boolean) : undefined,
          collectedBy: collectedBy || undefined
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "无法编排对谈稿");
      const next = payload.data as PodcastDraft;
      setDraft(next);
      setSaved((current) => [
        { id: next.id, title: next.title, form: next.form, turns: next.script.turns.length, updatedAt: next.updatedAt },
        ...current.filter((item) => item.id !== next.id)
      ]);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ block: "start" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "无法编排对谈稿");
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
          <h3><span className="step-number">2</span>对谈设置</h3>
          <div className="grid">
            <label className="editor-field">
              <span>对谈形式</span>
              <select className="select" value={form} onChange={(event) => setForm(event.target.value as PodcastForm)} disabled={isRunning}>
                {Object.entries(PODCAST_FORM_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
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
              <span>{form === "debate" ? "辩论双方" : "嘉宾姓名"}（可空，多个姓名用逗号分隔）</span>
              <input className="input" value={guestNames} onChange={(event) => setGuestNames(event.target.value)} placeholder={form === "debate" ? "例如：论证方，质询方" : form === "roundtable" ? "例如：林夏，陈默，李青" : "留空则按材料角色，或使用默认嘉宾"} />
            </label>
          </div>
          <p className="form-help">{form === "interview" ? "访谈支持 1–3 位嘉宾，围绕材料逐步追问。" : form === "debate" ? "辩论需要两位发言者，按立论、质询、回应和总结组织。角色分工不代表资料作者的真实立场。" : "圆桌支持 2–4 位嘉宾，先逐人发言，再交叉回应，最后由主持人收束。"} 留空时使用材料中的角色或默认姓名。</p>
        </div>
        {error ? <div className="notice notice-error">{error}</div> : null}
        <button className="button button-dark" type="button" onClick={runDialogue} disabled={isRunning || feedText.trim().length < 20}>
          {isRunning ? "编排中…" : `编排${formLabel}稿`}
        </button>
      </section>

      <div ref={resultRef}>{draft ? <StudioPodcastScript draft={draft} /> : null}</div>

      <section>
        <div className="section-header">
          <div>
            <h2>已保存的对谈草稿</h2>
          </div>
        </div>
        <div className="studio-list">
          {saved.length ? saved.map((item) => (
            <Link href={`/studio/podcast/${item.id}`} className="studio-row" key={item.id}>
              <div>
                <span className="status draft">{PODCAST_FORM_LABELS[item.form]}草稿</span>
                <h3>{item.title}</h3>
              </div>
              <div className="studio-row-meta">
                <span>{item.turns} 轮</span>
                <span>{item.updatedAt.slice(0, 16).replace("T", " ")}</span>
                <span className="go">查看 →</span>
              </div>
            </Link>
          )) : <p className="empty-state">还没有对谈草稿。</p>}
        </div>
      </section>
    </>
  );
}
