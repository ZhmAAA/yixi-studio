import { SiteChrome } from "@/components/site-chrome";
import { isPublicCreateEnabled } from "@/lib/studio-auth";
import { listPublishedEpisodes } from "@/server/repositories/episode-repository";

export async function SiteHeader() {
  const createEnabled = isPublicCreateEnabled();
  const featured = (await listPublishedEpisodes())[0];

  return <SiteChrome featuredHref={featured ? `/episodes/${featured.id}` : undefined} createEnabled={createEnabled} />;
}
