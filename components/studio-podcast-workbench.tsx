"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { StudioPodcastScript } from "@/components/studio-podcast-script";
import { PODCAST_FORM_LABELS } from "@/lib/podcast-forms";
import type { CollectedBy, PodcastDraft, PodcastForm, PodcastGeneration } from "@/server/podcast/contracts";

type GenerationMode = PodcastGeneration["mode"];

export type PodcastModelAvailability = {
  ready: boolean;
  model: string | null;
  message: string;
};

export type PodcastDraftSummary = {
  id: string;
  title: string;
  form: PodcastForm;
  turns: number;
  updatedAt: string;
  generation?: Pick<PodcastGeneration, "mode" | "model">;
};

const collectedOptions: Array<{ value: "" | CollectedBy; label: string }> = [
  { value: "", label: "按进料标注，否则算用户搜集" },
  { value: "user", label: "用户搜集" },
  { value: "ai", label: "AI 搜集" },
  { value: "mixed", label: "用户与 AI" }
];

export function StudioPodcastWorkbench({ recent, availability }: {
  recent: PodcastDraftSummary[];
  availability: PodcastModelAvailability;
}) {
  const [feedText, setFeedText] = useState("");
  const [title, setTitle] = useState("");
  const [hostName, setHostName] = useState("");
  const [guestNames, setGuestNames] = useState("");
  const [form, setForm] = useState<PodcastForm>("interview");
  const [generationMode, setGenerationMode] = useState<GenerationMode>(availability.ready ? "model" : "template");
  const formLabel = PODCAST_FORM_LABELS[form];
  const modeLabel = generationMode === "model" ? "模型生成" : "模板编排";
  const modelUnavailable = generationMode === "model" && !availability.ready;
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
    if (isRunning || modelUnavailable) return;
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
          generationMode,
          title: title.trim() || undefined,
          hostName: hostName.trim() || undefined,
          guestNames: guestNames.trim() ? guestNames.split(/[、,，;；\n]+/).map((name) => name.trim()).filter(Boolean) : undefined,
          collectedBy: collectedBy || undefined
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "生成服务未返回可用结果，请稍后手动重试。");
      if (!payload?.data) throw new Error("生成结果不完整，请检查已保存列表后手动重试。");
      const next = payload.data as PodcastDraft;
      if (generationMode === "model" && next.generation?.mode !== "model") {
        throw new Error("服务未返回可确认的模型生成结果，请检查已保存列表；本次请求未自动改用模板。");
      }
      setDraft(next);
      setSaved((current) => [
        { id: next.id, title: next.title, form: next.form, turns: next.script.turns.length, updatedAt: next.updatedAt,
          generation: next.generation ? { mode: next.generation.mode, model: next.generation.model } : undefined },
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
      <section className="card podcast-form" aria-busy={isRunning}>
        <div className="form-step">
          <h3><span className="step-number">1</span>放入进料</h3>
          <p className="form-help">粘贴用户搜集或 AI 搜集的材料。可用「标题：」「话题：」「角色：主持：姓名；嘉宾：姓名」「来源：」「笔记：」分行。不写标签时，段落会直接成为来源。</p>
          <label className="editor-field">
            <span>进料正文</span>
            <textarea
              className="textarea podcast-feed"
              value={feedText}
              disabled={isRunning}
              placeholder={"标题：夜间的老街\n话题：城市更新、居住\n角色：主持：林夏；嘉宾：陈默\n\n来源：居委会纪要\n过去三年，这条街的铺面换了四轮。住户最在意的不是招牌，而是夜里还能不能回家。\n\n笔记：\n夜间施工被投诉 27 次，主要集中在周三和周五。"}
              onChange={(event) => setFeedText(event.target.value)}
            />
          </label>
          <label className="editor-field">
            <span>或上传 txt / md</span>
            <input
              className="input"
              type="file"
              disabled={isRunning}
              accept=".txt,.md,text/plain,text/markdown"
              onChange={(event) => onFile(event.target.files?.[0])}
            />
          </label>
        </div>
        <div className="form-step">
          <h3><span className="step-number">2</span>对谈设置</h3>
          <div className="grid">
            <label className="editor-field">
              <span>生成方式</span>
              <select className="select" value={generationMode} onChange={(event) => setGenerationMode(event.target.value as GenerationMode)} disabled={isRunning}>
                <option value="model" disabled={!availability.ready}>模型生成{availability.ready ? "" : "（暂不可用）"}</option>
                <option value="template">模板编排</option>
              </select>
            </label>
            <label className="editor-field">
              <span>对谈形式</span>
              <select className="select" value={form} onChange={(event) => setForm(event.target.value as PodcastForm)} disabled={isRunning}>
                {Object.entries(PODCAST_FORM_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="editor-field">
              <span>标题（可空）</span>
              <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="留空则从进料取" disabled={isRunning} />
            </label>
            <label className="editor-field">
              <span>材料从哪来</span>
              <select className="select" value={collectedBy} onChange={(event) => setCollectedBy(event.target.value as "" | CollectedBy)} disabled={isRunning}>
                {collectedOptions.map((option) => <option value={option.value} key={option.label}>{option.label}</option>)}
              </select>
            </label>
            <label className="editor-field">
              <span>主持人（可空）</span>
              <input className="input" value={hostName} onChange={(event) => setHostName(event.target.value)} placeholder="留空则用角色行或「主持人」" disabled={isRunning} />
            </label>
            <label className="editor-field">
              <span>{form === "debate" ? "辩论双方" : "嘉宾姓名"}（可空，多个姓名用逗号分隔）</span>
              <input className="input" value={guestNames} onChange={(event) => setGuestNames(event.target.value)} placeholder={form === "debate" ? "例如：论证方，质询方" : form === "roundtable" ? "例如：林夏，陈默，李青" : "留空则按材料角色，或使用默认嘉宾"} disabled={isRunning} />
            </label>
          </div>
          <p className="form-help">{form === "interview" ? "访谈支持 1–3 位嘉宾，围绕材料逐步追问。" : form === "debate" ? "辩论需要两位发言者，按立论、质询、回应和总结组织。角色分工不代表资料作者的真实立场。" : "圆桌支持 2–4 位嘉宾，先逐人发言，再交叉回应，最后由主持人收束。"} 留空时使用材料中的角色或默认姓名。</p>
          <div className="notice podcast-mode-notice">
            <strong>当前方式：{modeLabel}{generationMode === "model" && availability.model ? ` · ${availability.model}` : ""}</strong>
            <p>{generationMode === "model" ? "将本次信息包交给已配置的模型生成对谈文本，可能需要 1–2 分钟。模型输出仍需逐轮审核；失败后可手动重试，不会自动切换为模板。" : "按固定流程组织材料。生成结果会明确标记为模板稿。"}</p>
            {!availability.ready ? <p>模型生成暂不可用：{availability.message || "模型配置尚未就绪。"}</p> : null}
          </div>
        </div>
        {error ? <div className="notice notice-error" role="alert"><strong>上次请求未成功取得稿件</strong><p>{error}</p><p>请检查已保存列表后再手动重试；系统不会自动改用模板。</p></div> : null}
        {isRunning ? <p className="form-help" role="status" aria-live="polite">{generationMode === "model" ? "模型正在生成，可能需要 1–2 分钟，请保留此页面。" : "正在按模板编排并保存草稿。"}</p> : null}
        <button className="button button-dark" type="button" onClick={runDialogue} disabled={isRunning || modelUnavailable || feedText.trim().length < 20}>
          {isRunning ? `${modeLabel}中…` : `${error ? "重试：" : ""}${modeLabel}${formLabel}稿`}
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
                <span className="tag podcast-generation-tag">{item.generation ? item.generation.mode === "model" ? "模型生成" : "模板编排" : "历史模板稿"}</span>
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
