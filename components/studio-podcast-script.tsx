import { PODCAST_FORM_LABELS, PODCAST_ROLE_LABELS } from "@/lib/podcast-forms";
import type { PodcastDraft } from "@/server/podcast/contracts";

const collectedLabel = {
  user: "用户搜集",
  ai: "AI 搜集",
  mixed: "用户与 AI"
} as const;

const provenanceLabels = {
  quote: "原文引用",
  summary: "材料摘要",
  synthetic: "AI 演绎"
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
  const sources = new Map(draft.package.sources.map((source) => [source.id, source]));
  const audioReady = draft.audioPlan.segments.some((segment) => segment.audioIncluded);
  const generation = draft.generation;
  const generationLabel = generation ? generation.mode === "model" ? "模型生成" : "模板编排" : "历史模板稿";

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
          <div className="tag-row"><span className="tag">{generationLabel}</span><span className="tag">{draft.script.turns.length} 轮</span></div>
        </div>
        {generation ? (
          <div className="podcast-generation-record">
            <p className="form-help">{generation.mode === "model" ? `模型：${generation.model || "未记录模型名称"} · ` : ""}生成耗时 {(generation.durationMs / 1000).toFixed(1)} 秒</p>
            <details>
              <summary>生成记录</summary>
              <dl className="podcast-generation-details">
                <dt>生成方式</dt><dd>{generationLabel}</dd>
                <dt>提供方</dt><dd>{generation.provider}</dd>
                <dt>提示词版本</dt><dd>{generation.promptVersion}</dd>
                <dt>生成时间</dt><dd><time dateTime={generation.generatedAt}>{generation.generatedAt}</time></dd>
                {generation.usage ? <><dt>Token 用量</dt><dd>输入 {generation.usage.inputTokens.toLocaleString("zh-CN")} · 输出 {generation.usage.outputTokens.toLocaleString("zh-CN")} · 合计 {generation.usage.totalTokens.toLocaleString("zh-CN")}</dd></> : null}
              </dl>
            </details>
          </div>
        ) : <p className="form-help">这份历史模板稿未记录模型或生成用量。</p>}
        <p className="form-help">{draft.script.speakers.map((speaker) => `${speaker.name}（${PODCAST_ROLE_LABELS[speaker.role] ?? "嘉宾"}）`).join(" · ")}</p>
        <p className="form-help">逐轮区分原文引用、材料摘要与 AI 演绎。引用与摘要均需核对来源，不表示事实已经核实。</p>
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
                  <span className="tag">{turn.provenance ? provenanceLabels[turn.provenance] : "未记录内容类型"}</span>
                </header>
                <p>{turn.text}</p>
                <div className="podcast-citations">
                  {turn.sourceIds.map((id) => {
                    const source = sources.get(id);
                    return <a key={id} href={`#${draft.id}-${id}`}>来源：{source?.title || id}</a>;
                  })}
                  {turn.noteIndexes?.map((index) => <a key={`note-${index}`} href={`#${draft.id}-note-${index}`}>笔记 {index + 1}</a>)}
                  {!turn.sourceIds.length && !turn.noteIndexes?.length ? <span>待补充逐轮引用</span> : null}
                </div>
                {turn.evidence?.length ? (
                  <details className="podcast-evidence">
                    <summary>查看依据原文（{turn.evidence.length} 处）</summary>
                    <ol>
                      {turn.evidence.map((evidence, index) => {
                        const source = evidence.sourceId ? sources.get(evidence.sourceId) : undefined;
                        const hasNote = evidence.noteIndex !== null && draft.package.notes[evidence.noteIndex] !== undefined;
                        return (
                          <li key={index}>
                            <div className="podcast-citations">
                              {source ? <a href={`#${draft.id}-${source.id}`}>来源：{source.title || source.id}</a> : null}
                              {hasNote ? <a href={`#${draft.id}-note-${evidence.noteIndex}`}>笔记 {evidence.noteIndex! + 1}</a> : null}
                              {!source && !hasNote ? <span>原文位置待核对</span> : null}
                            </div>
                            <blockquote>{evidence.quote}</blockquote>
                          </li>
                        );
                      })}
                    </ol>
                  </details>
                ) : null}
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
