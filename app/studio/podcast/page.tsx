import { StudioPodcastWorkbench } from "@/components/studio-podcast-workbench";
import { listPodcastDrafts } from "@/server/repositories/podcast-repository";

export default async function StudioPodcastPage() {
  const drafts = await listPodcastDrafts();

  return (
    <div className="container">
      <section className="page-intro">
        <span className="kicker">播客工作流</span>
        <h1>编排一场访谈</h1>
        <p>把搜集来的材料收成信息包，再排成听得下去的长对话。这一步只出访谈稿。语音、拼接和字幕先走可替换的接口，不调用外部供应商。</p>
      </section>
      <StudioPodcastWorkbench recent={drafts.map((draft) => ({
        id: draft.id,
        title: draft.title,
        turns: draft.script.turns.length,
        updatedAt: draft.updatedAt
      }))} />
    </div>
  );
}
