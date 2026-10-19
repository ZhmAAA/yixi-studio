import { NextResponse } from "next/server";
import { isStudioAuthorized } from "@/lib/studio-auth";
import { getPodcastDraft } from "@/server/repositories/podcast-repository";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isStudioAuthorized(request)) {
    console.warn("[auth] denied /api/studio/podcasts/[id]");
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const { id } = await params;
  const draft = await getPodcastDraft(id);
  if (!draft) return NextResponse.json({ error: "找不到对谈草稿" }, { status: 404 });
  return NextResponse.json({ data: draft });
}
