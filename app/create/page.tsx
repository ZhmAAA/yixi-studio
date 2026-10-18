"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { people, topics } from "@/lib/content";

export default function CreatePage() {
  const router = useRouter();
  const [topicId, setTopicId] = useState(topics[0].id);
  const [personIds, setPersonIds] = useState([people[0].id, people[1].id]);
  const [format, setFormat] = useState("观点对谈");
  const [duration, setDuration] = useState("约 4 分钟");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updatePerson(index: number, value: string) {
    setPersonIds((current) => current.map((id, position) => position === index ? value : id));
  }

  async function startEpisode() {
    setIsSubmitting(true);
    setError("");

    try {
      const createResponse = await fetch("/api/episodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, personIds, format, duration })
      });
      const createPayload = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(createPayload.error ?? "无法创建这一席");
      }

      const generateResponse = await fetch(`/api/episodes/${createPayload.data.id}/generate`, {
        method: "POST"
      });
      const generatePayload = await generateResponse.json();

      if (!generateResponse.ok) {
        throw new Error(generatePayload.error ?? "生成失败，请稍后重试");
      }

      router.push(`/episodes/${generatePayload.data.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "生成失败，请稍后重试");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container">
      <section className="page-intro">
        <span className="kicker">Create a conversation</span>
        <h1>开一席</h1>
        <p>选一个问题，再请两位人物入席。我们会根据公开资料整理背景、观点和讨论方向。</p>
      </section>
      <section className="card form-card">
        <div className="form-step">
          <h3><span className="step-number">1</span>选一个问题</h3>
          <select className="select" value={topicId} onChange={(event) => setTopicId(event.target.value)}>
            {topics.map((topic) => <option value={topic.id} key={topic.id}>{topic.title}</option>)}
          </select>
          <p className="form-help">热点问题会标注信息截至日期；经典问题会保留时代背景。</p>
        </div>
        <div className="form-step">
          <h3><span className="step-number">2</span>请两位人物入席</h3>
          <div className="grid">
            {[0, 1].map((index) => (
              <select className="select" value={personIds[index]} onChange={(event) => updatePerson(index, event.target.value)} key={index}>
                {people.map((person) => <option value={person.id} key={person.id}>{person.displayName} · {person.role}</option>)}
              </select>
            ))}
          </div>
          <p className="form-help">人物发言是基于公开资料的 AI 演绎，不是本人真实发言。</p>
        </div>
        <div className="form-step">
          <h3><span className="step-number">3</span>决定这一席怎么聊</h3>
          <div className="grid">
            <select className="select" value={format} onChange={(event) => setFormat(event.target.value)}>
              <option>观点对谈</option>
              <option disabled>访谈（即将开放）</option>
              <option disabled>观点交锋（即将开放）</option>
            </select>
            <select className="select" value={duration} onChange={(event) => setDuration(event.target.value)}>
              <option>约 3 分钟</option>
              <option>约 4 分钟</option>
              <option>约 5 分钟</option>
            </select>
          </div>
        </div>
        <div className="notice">当前版本使用演示生成结果，正式版会在生成前固定来源快照、提示词版本和编辑策划单。</div>
        {error ? <div className="notice notice-error" role="alert">{error}</div> : null}
        <button className="button button-dark" style={{ marginTop: 20 }} onClick={startEpisode} disabled={isSubmitting}>
          {isSubmitting ? "正在整理这一席…" : "开始生成这席对谈"}
        </button>
      </section>
    </div>
  );
}
