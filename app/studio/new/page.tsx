"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { people, topics } from "@/lib/content";

export default function NewStudioEpisodePage() {
  const router = useRouter();
  const [topicId, setTopicId] = useState(topics[0].id);
  const [personIds, setPersonIds] = useState([topics[0].recommendedPersonIds[0], topics[0].recommendedPersonIds[1]]);
  const [duration, setDuration] = useState("约 3 分钟");
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  function updateTopic(value: string) {
    const topic = topics.find((candidate) => candidate.id === value) ?? topics[0];
    setTopicId(topic.id);
    setPersonIds([topic.recommendedPersonIds[0] ?? people[0].id, topic.recommendedPersonIds[1] ?? people[1].id]);
  }

  async function createDraft() {
    setIsCreating(true);
    setError("");
    try {
      const response = await fetch("/api/episodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, personIds, format: "观点对谈", duration })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "无法创建草稿");
      router.push(`/studio/episodes/${payload.data.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "无法创建草稿");
      setIsCreating(false);
    }
  }

  return (
    <div className="container">
      <section className="page-intro">
        <span className="kicker">新建</span>
        <h1>新建一席</h1>
        <p>先确定问题和入席人物，再进入工作台手工录入对谈。这里不会自动发布内容。</p>
      </section>
      <section className="card form-card">
        <div className="form-step">
          <h3><span className="step-number">1</span>选择问题</h3>
          <select className="select" value={topicId} onChange={(event) => updateTopic(event.target.value)}>
            {topics.map((topic) => <option value={topic.id} key={topic.id}>{topic.title}</option>)}
          </select>
        </div>
        <div className="form-step">
          <h3><span className="step-number">2</span>确定入席人物</h3>
          <div className="grid">
            {[0, 1].map((index) => (
              <select className="select" value={personIds[index]} onChange={(event) => setPersonIds((current) => current.map((id, position) => position === index ? event.target.value : id))} key={index}>
                {people.map((person) => <option value={person.id} key={person.id}>{person.displayName} · {person.role}</option>)}
              </select>
            ))}
          </div>
        </div>
        <div className="form-step">
          <h3><span className="step-number">3</span>设置目标时长</h3>
          <select className="select" value={duration} onChange={(event) => setDuration(event.target.value)}>
            <option>约 3 分钟</option>
            <option>约 4 分钟</option>
            <option>约 5 分钟</option>
          </select>
        </div>
        {error ? <div className="notice notice-error">{error}</div> : null}
        <button className="button button-dark" style={{ marginTop: 20 }} type="button" onClick={createDraft} disabled={isCreating}>
          {isCreating ? "创建中…" : "进入编辑工作台"}
        </button>
      </section>
    </div>
  );
}
