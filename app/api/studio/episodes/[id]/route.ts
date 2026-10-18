import { NextResponse } from "next/server";
import { StudioEpisodeUpdateSchema } from "@/server/contracts";
import { getEpisodeRecord, updateEpisodeRecord } from "@/server/repositories/episode-repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const episode = getEpisodeRecord(id);
  if (!episode) return NextResponse.json({ error: "找不到对应一席" }, { status: 404 });
  return NextResponse.json({ data: episode });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = getEpisodeRecord(id);
  if (!current) return NextResponse.json({ error: "找不到对应一席" }, { status: 404 });

  try {
    const input = StudioEpisodeUpdateSchema.parse(await request.json());
    const episode = updateEpisodeRecord(id, input);
    return NextResponse.json({ data: episode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
