import { NextResponse } from "next/server";
import { getEpisodeRecord } from "@/server/repositories/episode-repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const episode = getEpisodeRecord(id);
  if (!episode) {
    return NextResponse.json({ error: "找不到对应一席" }, { status: 404 });
  }
  return NextResponse.json({ data: episode });
}
