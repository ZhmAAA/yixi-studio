import { notFound } from "next/navigation";
import { getEpisodeRecord } from "@/server/repositories/episode-repository";
import StudioEpisodeEditor from "@/components/studio-episode-editor";

export default async function StudioEpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const episode = await getEpisodeRecord(id);
  if (!episode) notFound();

  return (
    <div className="container">
      <StudioEpisodeEditor initialEpisode={episode} />
    </div>
  );
}
