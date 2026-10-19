import { PODCAST_FORM_LABELS, PODCAST_ROLE_LABELS } from "@/lib/podcast-forms";
import type { PodcastDraft } from "@/server/podcast/contracts";

const collectedLabel = {
  user: "用户搜集",
  ai: "AI 搜集",
  mixed: "用户与 AI"
} as const;

function formatDuration(ms: number) {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds} 秒`;
  return `${minutes} 分 ${seconds.toString().padStart(2, "0")} 秒`;
}

function safeUrl(url?: string) {
  if (!url) return undefined;
  if (url.startsWith("https://") || url.startsWith("http://")) return url;
  return undefined;
}

export function StudioPodcastScript({ draft }: { draft: PodcastDraft }) {
  const speakers = new Map(draft.script.speakers.map((speaker) => [speaker.id, speaker]));
  const audioReady = draft.audioPlan.segments.some((segment) => segment.audioIncluded);

  return (
    <div className="podcast-layout">
      <section className="card editor-section">
        <div className="section-header">
          <div><h2>信息包</h2></div>
          <span className="tag">{collectedLabel[draft.package.collectedBy]}</span>
        </div>
        <p className="form-help">进料先整理成来源和笔记，再交给对谈编排。公开页不会读到这份草稿。</p>
        <div className="tag-row">
          <span className="tag">{PODCAST_FORM_LABELS[draft.form]}</span>
          {(draft.package.topicTags ?? []).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
          {(draft.package.roleTags ?? []).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
        </div>
        <div className="podcast-package">
          {draft.package.sources.map((source) => {
            const href = safeUrl(source.url);
            return (
              <article className="podcast-source" id={`${draft.id}-${source.id}`} key={source.id}>
                <strong>{source.title || source.id}</strong>
                {href ? <a className="link-quiet" href={href} rel="noreferrer" target="_blank">{href}</a> : null}
                <p>{source.excerpt}</p>
              </article>
            );
          })}
          {draft.package.notes.length ? (
            <div>
              <strong>笔记</strong>
              <ul className="podcast-notes">
                {draft.package.notes.map((note, index) => <li id={`${draft.id}-note-${index}`} key={index}>笔记 {index + 1}：{note}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section className="card editor-section">
        <div className="section-header">
          <div><h2>{draft.script.title}</h2></div>
          <span className="tag">{draft.script.turns.length} 轮</span>
        </div>
        <p className="form-help">{draft.script.speakers.map((speaker) => `${speaker.name}（${PODCAST_ROLE_LABELS[speaker.role] ?? "嘉宾"}）`).join(" · ")}</p>
        {draft.script.warnings?.length ? <div className="notice" role="status">
          {draft.script.warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div> : null}
        <ol className="podcast-turns">
          {draft.script.turns.map((turn) => {
            const speaker = speakers.get(turn.speakerId);
            return (
              <li className="podcast-turn" key={turn.sequence}>
                <header>
                  <strong>第 {turn.sequence} 轮 · {speaker?.name ?? turn.speakerId}</strong>
                  {turn.stageDirection ? <span className="podcast-stage">{turn.stageDirection}</span> : null}
                </header>
                <p>{turn.text}</p>
                <div className="podcast-citations">
                  {turn.sourceIds.map((id) => {
                    const source = draft.package.sources.find((item) => item.id === id);
                    return <a key={id} href={`#${draft.id}-${id}`}>来源：{source?.title || id}</a>;
                  })}
                  {turn.noteIndexes?.map((index) => <a key={`note-${index}`} href={`#${draft.id}-note-${index}`}>笔记 {index + 1}</a>)}
                  {!turn.sourceIds.length && !turn.noteIndexes?.length ? <span>待补充逐轮引用</span> : null}
                </div>
              </li>
            );
          })}
        </ol>
        <div className="disclosure"><strong>演绎边界</strong>{draft.script.disclosure}</div>
      </section>

      <section className="card editor-section">
        <div className="section-header">
          <div><h2>音频与字幕</h2></div>
          <span className="tag">{draft.audioPlan.providerId}</span>
        </div>
        <p className="form-help">
          {draft.audioPlan.status === "stub"
            ? "桩实现，未请求供应商，也没有音频文件。"
            : "已记下供应商名称，这一版仍不发起合成。"}
          {audioReady ? "分段里带有音频。" : "分段只有时长估计。"}
        </p>
        <p className="podcast-audio-meta">
          {draft.audioPlan.segments.length} 段 · 估计 {formatDuration(draft.audioPlan.totalDurationMs)}
        </p>
        <pre className="srt-preview">{draft.srt}</pre>
      </section>
    </div>
  );
}
