import { PODCAST_FORM_LABELS } from "@/lib/podcast-forms";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StudioPodcastScript } from "@/components/studio-podcast-script";
import { getPodcastDraft } from "@/server/repositories/podcast-repository";

export default async function StudioPodcastDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = await getPodcastDraft(id);
  if (!draft) notFound();

  return (
    <div className="container">
      <section className="page-intro">
        <span className="kicker">{PODCAST_FORM_LABELS[draft.form]}草稿</span>
        <h1>{draft.script.title}</h1>
        <p>这是工作台里保存的对谈稿，刷新后仍按这条 id 读取。公开页不会展示它。</p>
        <p><Link href="/studio/podcast" className="link-quiet">返回编排</Link></p>
      </section>
      <StudioPodcastScript draft={draft} />
    </div>
  );
}
