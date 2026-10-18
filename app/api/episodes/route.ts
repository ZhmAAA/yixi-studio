import { NextResponse } from "next/server";
import { requestErrorMessage } from "@/lib/request-error";
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
    return NextResponse.json({ error: requestErrorMessage(error, "无法创建一席") }, { status: 400 });
  }
}
