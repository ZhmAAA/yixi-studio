import { StudioPodcastWorkbench } from "@/components/studio-podcast-workbench";
import { listPodcastDrafts } from "@/server/repositories/podcast-repository";

export default async function StudioPodcastPage() {
  const drafts = await listPodcastDrafts();

  return (
    <div className="container">
      <section className="page-intro">
        <span className="kicker">播客工作流</span>
        <h1>编排一场对谈</h1>
        <p>把搜集来的材料收成信息包，再排成听得下去的长对话。可选择访谈、辩论或圆桌，生成后先作为草稿保存。语音、拼接和字幕先走可替换的接口，不调用外部供应商。</p>
      </section>
      <StudioPodcastWorkbench recent={drafts.map((draft) => ({
        id: draft.id,
        title: draft.title,
        form: draft.form,
        turns: draft.script.turns.length,
        updatedAt: draft.updatedAt
      }))} />
    </div>
  );
}
