import { NextResponse } from "next/server";
import { generateEpisodeService } from "@/server/services/episode-service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const episode = generateEpisodeService(id);
    return NextResponse.json({ data: episode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败";
    const status = message === "找不到对应一席" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
