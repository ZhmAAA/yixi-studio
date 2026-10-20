import { StudioPodcastWorkbench } from "@/components/studio-podcast-workbench";
import { listPodcastDrafts } from "@/server/repositories/podcast-repository";
import { getPodcastModelAvailability } from "@/server/agents/model-config";

export default async function StudioPodcastPage() {
  const drafts = await listPodcastDrafts();
  const availability = getPodcastModelAvailability();

  return (
    <div className="container">
      <section className="page-intro">
        <span className="kicker">播客工作流</span>
        <h1>编排一场对谈</h1>
        <p>把搜集来的材料收成信息包，生成访谈、辩论或圆桌草稿。文本可选择模型生成或模板编排，生成后逐轮核对材料。语音和音频拼接仍为占位，字幕仅提供时间估计。</p>
      </section>
      <StudioPodcastWorkbench recent={drafts.map((draft) => ({
        id: draft.id,
        title: draft.title,
        form: draft.form,
        turns: draft.script.turns.length,
        updatedAt: draft.updatedAt,
        generation: draft.generation ? { mode: draft.generation.mode, model: draft.generation.model } : undefined
      }))} availability={availability} />
    </div>
  );
}
