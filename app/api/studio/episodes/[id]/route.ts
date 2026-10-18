import { NextResponse } from "next/server";
import { requestErrorMessage } from "@/lib/request-error";
import { isStudioAuthorized } from "@/lib/studio-auth";
import { StudioEpisodeUpdateSchema } from "@/server/contracts";
import { getEpisodeRecord, updateEpisodeRecord } from "@/server/repositories/episode-repository";

function unauthorized() {
  console.warn("[auth] denied /api/studio/episodes/[id]");
  return NextResponse.json({ error: "未授权" }, { status: 401 });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isStudioAuthorized(request)) return unauthorized();
  const { id } = await params;
  const episode = await getEpisodeRecord(id);
  if (!episode) return NextResponse.json({ error: "找不到对应一席" }, { status: 404 });
  return NextResponse.json({ data: episode });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isStudioAuthorized(request)) return unauthorized();
  const { id } = await params;
  const current = await getEpisodeRecord(id);
  if (!current) return NextResponse.json({ error: "找不到对应一席" }, { status: 404 });

  try {
    const input = StudioEpisodeUpdateSchema.parse(await request.json());
    const episode = await updateEpisodeRecord(id, input);
    return NextResponse.json({ data: episode });
  } catch (error) {
    return NextResponse.json({ error: requestErrorMessage(error, "保存失败") }, { status: 400 });
  }
}
