"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { people, sources, type Turn } from "@/lib/content";
import type { EpisodeRecord, EpisodeStatus } from "@/server/repositories/episode-repository";

type EditableEpisode = Pick<EpisodeRecord, "id" | "title" | "question" | "combinationType" | "disclosure" | "personIds" | "format" | "duration" | "turns" | "status">;

const provenanceOptions: Turn["provenance"][] = ["观点摘要", "事实背景", "合成演绎"];

export default function StudioEpisodeEditor({ initialEpisode }: { initialEpisode: EditableEpisode }) {
  const [episode, setEpisode] = useState<EditableEpisode>(() => ({
    ...initialEpisode,
    status: initialEpisode.status === "published" || initialEpisode.status === "review" ? initialEpisode.status : "draft",
    turns: initialEpisode.turns.length ? initialEpisode.turns : [{
      sequence: 1,
      speakerId: initialEpisode.personIds[0],
      text: "",
      provenance: "合成演绎",
      citationIds: []
    }]
  }));
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const episodePeople = useMemo(
    () => people.filter((person) => episode.personIds.includes(person.id)),
    [episode.personIds]
  );

  function updateField(field: "title" | "question" | "combinationType" | "disclosure", value: string) {
    setEpisode((current) => ({ ...current, [field]: value }));
  }

  function updateTurn(index: number, patch: Partial<Turn>) {
    setEpisode((current) => ({
      ...current,
      turns: current.turns.map((turn, turnIndex) => turnIndex === index ? { ...turn, ...patch } : turn)
    }));
  }

  function addTurn() {
    setEpisode((current) => ({
      ...current,
      turns: [
        ...current.turns,
        {
          sequence: current.turns.length + 1,
          speakerId: current.personIds[current.turns.length % current.personIds.length],
          text: "",
          provenance: "合成演绎",
          citationIds: []
        }
      ]
    }));
  }

  function removeTurn(index: number) {
    setEpisode((current) => ({
      ...current,
      turns: current.turns.filter((_, turnIndex) => turnIndex !== index).map((turn, turnIndex) => ({ ...turn, sequence: turnIndex + 1 }))
    }));
  }

  async function saveEpisode() {
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/studio/episodes/${episode.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: episode.title,
          question: episode.question,
          combinationType: episode.combinationType,
          disclosure: episode.disclosure,
          status: episode.status === "published" ? "published" : episode.status === "review" ? "review" : "draft",
          turns: episode.turns
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "保存失败");
      setEpisode(payload.data);
      setMessage("已保存。发布前请逐轮检查来源和演绎标记。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="studio-editor">
      <div className="studio-toolbar">
        <div>
          <span className="kicker">Episode editor</span>
          <h1>编辑这一席</h1>
        </div>
        <div className="hero-actions">
          <Link href={`/episodes/${episode.id}`} className="button button-light">预览公开页</Link>
          <button className="button button-dark" type="button" onClick={saveEpisode} disabled={isSaving}>
            {isSaving ? "保存中…" : "保存内容"}
          </button>
        </div>
      </div>

      <div className="studio-editor-layout">
        <main className="studio-editor-main">
          <section className="card editor-section">
            <div className="section-header"><div><span className="kicker">Brief</span><h2>这一席讲什么</h2></div><span className="tag">{episode.duration}</span></div>
            <label className="editor-field"><span>标题</span><input className="input" value={episode.title} onChange={(event) => updateField("title", event.target.value)} /></label>
            <label className="editor-field"><span>核心问题</span><textarea className="textarea" value={episode.question} onChange={(event) => updateField("question", event.target.value)} /></label>
            <label className="editor-field"><span>内容组合</span><input className="input" value={episode.combinationType} onChange={(event) => updateField("combinationType", event.target.value)} /></label>
          </section>

          <section className="card editor-section">
            <div className="section-header"><div><span className="kicker">Dialogue</span><h2>把话说完</h2></div><button className="button button-light" type="button" onClick={addTurn}>+ 增加一轮</button></div>
            <div className="turn-editor-list">
              {episode.turns.map((turn, index) => (
                <div className="turn-editor" key={turn.sequence}>
                  <div className="turn-editor-topline"><strong>第 {turn.sequence} 轮</strong><button className="text-button" type="button" onClick={() => removeTurn(index)} disabled={episode.turns.length <= 1}>删除</button></div>
                  <div className="grid">
                    <select className="select" value={turn.speakerId} onChange={(event) => updateTurn(index, { speakerId: event.target.value })}>
                      {episodePeople.map((person) => <option value={person.id} key={person.id}>{person.displayName}</option>)}
                    </select>
                    <select className="select" value={turn.provenance} onChange={(event) => updateTurn(index, { provenance: event.target.value as Turn["provenance"] })}>
                      {provenanceOptions.map((option) => <option value={option} key={option}>{option}</option>)}
                    </select>
                  </div>
                  <textarea className="textarea" placeholder="录入这一轮的内容…" value={turn.text} onChange={(event) => updateTurn(index, { text: event.target.value })} />
                  <input className="input" placeholder="来源 ID，用逗号分隔，例如 source-arendt" value={turn.citationIds.join(", ")} onChange={(event) => updateTurn(index, { citationIds: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} />
                </div>
              ))}
            </div>
          </section>

          <section className="card editor-section">
            <div className="section-header"><div><span className="kicker">Disclosure</span><h2>发布声明</h2></div></div>
            <textarea className="textarea" value={episode.disclosure} onChange={(event) => updateField("disclosure", event.target.value)} />
          </section>
        </main>

        <aside className="studio-editor-aside">
          <section className="card">
            <h3>状态</h3>
            <select className="select" value={episode.status === "published" ? "published" : episode.status === "review" ? "review" : "draft"} onChange={(event) => setEpisode((current) => ({ ...current, status: event.target.value as EpisodeStatus }))}>
              <option value="draft">草稿</option>
              <option value="review">待审核</option>
              <option value="published">已发布</option>
            </select>
            {message ? <p className="save-message">{message}</p> : null}
          </section>
          <section className="card">
            <h3>入席人物</h3>
            <div className="studio-people">{episodePeople.map((person) => <div className="studio-person" key={person.id}><span className="avatar">{person.shortName}</span><div><strong>{person.displayName}</strong><span className="muted">{person.role}</span></div></div>)}</div>
          </section>
          <section className="card">
            <h3>来源提示</h3>
            <p className="muted">每一轮需要明确内容类型。事实背景和观点摘要应关联来源，合成演绎不能写成真实引语。</p>
            <div className="source-id-list">{sources.filter((source) => episode.turns.some((turn) => turn.citationIds.includes(source.id))).map((source) => <span className="tag" key={source.id}>{source.id}</span>)}</div>
          </section>
        </aside>
      </div>
    </div>
  );
}
