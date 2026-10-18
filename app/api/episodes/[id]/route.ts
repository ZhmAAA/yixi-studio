import { NextResponse } from "next/server";
import { isStudioAuthorized } from "@/lib/studio-auth";
import { getEpisodeRecord } from "@/server/repositories/episode-repository";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const episode = await getEpisodeRecord(id);
  if (!episode || (episode.status !== "published" && !isStudioAuthorized(request))) {
    return NextResponse.json({ error: "找不到对应一席" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ data: episode }, { headers: { "Cache-Control": "no-store" } });
}
