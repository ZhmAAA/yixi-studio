import { NextResponse } from "next/server";
import { isPublicCreateEnabled, isStudioAuthorized } from "@/lib/studio-auth";
import { generateEpisodeService } from "@/server/services/episode-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isStudioAuthorized(request) && !isPublicCreateEnabled()) {
    console.warn("[auth] denied POST /api/episodes/[id]/generate");
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const episode = await generateEpisodeService(id);
    return NextResponse.json({ data: episode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败";
    const status = message === "找不到对应一席" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
