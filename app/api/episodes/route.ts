import { NextResponse } from "next/server";
import { isPublicCreateEnabled, isStudioAuthorized } from "@/lib/studio-auth";
import { EpisodeCreateInputSchema } from "@/server/contracts";
import { createEpisodeService } from "@/server/services/episode-service";

export async function POST(request: Request) {
  if (!isStudioAuthorized(request) && !isPublicCreateEnabled()) {
    console.warn("[auth] denied POST /api/episodes");
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const input = EpisodeCreateInputSchema.parse(body);
    const episode = await createEpisodeService(input);
    return NextResponse.json({ data: episode }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "无法创建一席";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
