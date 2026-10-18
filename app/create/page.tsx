import { CreateClosedPanel } from "@/components/create-closed-panel";
import CreateEpisodeForm from "@/components/create-episode-form";
import { isPublicCreateEnabled } from "@/lib/studio-auth";

export default function CreatePage() {
  if (!isPublicCreateEnabled()) return <CreateClosedPanel />;
  return <CreateEpisodeForm />;
}
