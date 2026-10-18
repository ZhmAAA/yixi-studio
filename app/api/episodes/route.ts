import { NextResponse } from "next/server";
import { EpisodeCreateInputSchema } from "@/server/contracts";
import { createEpisodeService } from "@/server/services/episode-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = EpisodeCreateInputSchema.parse(body);
    const episode = createEpisodeService(input);
    return NextResponse.json({ data: episode }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "无法创建一席";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
