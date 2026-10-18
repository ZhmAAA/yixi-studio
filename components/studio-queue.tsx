"use client";

import Link from "next/link";
import { useState } from "react";
import type { EpisodeStatus } from "@/server/repositories/episode-types";

export type StudioQueueItem = {
  id: string;
  title: string;
  question: string;
  status: EpisodeStatus;
  people: number;
  turns: number;
};

const filters = [
  { id: "all", label: "全部" },
  { id: "draft", label: "草稿" },
  { id: "review", label: "待审核" },
  { id: "published", label: "已发布" }
] as const;

const statusLabel: Record<EpisodeStatus, string> = {
  draft: "草稿",
  review: "待审核",
  published: "已发布",
  pending: "待整理",
  generating: "生成中",
  failed: "生成失败"
};

function statusClass(status: EpisodeStatus) {
  if (status === "published") return "status";
  if (status === "review") return "status review";
  return "status draft";
}

function matches(status: EpisodeStatus, filter: (typeof filters)[number]["id"]) {
  if (filter === "all") return true;
  if (filter === "review") return status === "review";
  if (filter === "published") return status === "published";
  return status !== "review" && status !== "published";
}

export function StudioQueue({ items }: { items: StudioQueueItem[] }) {
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const visible = items.filter((item) => matches(item.status, filter));

  return (
    <>
      <div className="filters" role="tablist" aria-label="按状态筛选">
        {filters.map((item) => (
          <button className={filter === item.id ? "is-on" : undefined} type="button" onClick={() => setFilter(item.id)} key={item.id}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="studio-list">
        {visible.length ? visible.map((episode) => (
          <Link href={`/studio/episodes/${episode.id}`} className="studio-row" key={episode.id}>
            <div>
              <span className={statusClass(episode.status)}>{statusLabel[episode.status]}</span>
              <h3>{episode.title}</h3>
              <p>{episode.question}</p>
            </div>
            <div className="studio-row-meta">
              <span>{episode.people} 人</span>
              <span>{episode.turns} 轮</span>
              <span className="go">编辑 →</span>
            </div>
          </Link>
        )) : <p className="empty-state">这一栏还没有对谈。</p>}
      </div>
    </>
  );
}
