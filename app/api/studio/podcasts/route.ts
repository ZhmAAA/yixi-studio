import { NextResponse } from "next/server";
import { requestErrorMessage } from "@/lib/request-error";
import { isStudioAuthorized } from "@/lib/studio-auth";
import { listPodcastDrafts } from "@/server/repositories/podcast-repository";
import { createInterviewDraft } from "@/server/services/podcast-service";

function unauthorized() {
  console.warn("[auth] denied /api/studio/podcasts");
  return NextResponse.json({ error: "未授权" }, { status: 401 });
}

export async function GET(request: Request) {
  if (!isStudioAuthorized(request)) return unauthorized();
  const drafts = await listPodcastDrafts();
  return NextResponse.json({
    data: drafts.map((draft) => ({
      id: draft.id,
      title: draft.title,
      form: draft.form,
      status: draft.status,
      turns: draft.script.turns.length,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt
    }))
  });
}

export async function POST(request: Request) {
  if (!isStudioAuthorized(request)) return unauthorized();
  try {
    const draft = await createInterviewDraft(await request.json());
    return NextResponse.json({ data: draft }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: requestErrorMessage(error, "无法编排访谈稿") }, { status: 400 });
  }
}
