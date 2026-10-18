import { CreateClosedPanel } from "@/components/create-closed-panel";
import CreateEpisodeForm from "@/components/create-episode-form";
import { isPublicCreateEnabled } from "@/lib/studio-auth";
import { listPublishedEpisodes } from "@/server/repositories/episode-repository";

export default async function CreatePage() {
  if (!isPublicCreateEnabled()) {
    const featured = (await listPublishedEpisodes())[0];
    return <CreateClosedPanel featuredHref={featured ? `/episodes/${featured.id}` : undefined} />;
  }
  return <CreateEpisodeForm />;
}
