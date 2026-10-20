import { NextResponse } from "next/server";
import { requestErrorMessage } from "@/lib/request-error";
import { isStudioAuthorized } from "@/lib/studio-auth";
import { listPodcastDrafts } from "@/server/repositories/podcast-repository";
import { createPodcastDraft } from "@/server/services/podcast-service";
import { PodcastModelError } from "@/server/agents/model-config";

export const runtime = "nodejs";
export const maxDuration = 180;

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
      updatedAt: draft.updatedAt,
      generationMode: draft.generation?.mode ?? "template"
    }))
  });
}

export async function POST(request: Request) {
  if (!isStudioAuthorized(request)) return unauthorized();
  try {
    const draft = await createPodcastDraft(await request.json(), { signal: request.signal });
    return NextResponse.json({ data: draft }, { status: 201 });
  } catch (error) {
    if (error instanceof PodcastModelError) {
      console.warn("[podcast] model request failed", { code: error.code });
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: requestErrorMessage(error, "无法编排对谈稿") }, { status: 400 });
  }
}
