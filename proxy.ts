import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isPublicCreateEnabled, isStudioAuthorized } from "@/lib/studio-auth";
import { studioUnauthorizedHtml } from "@/lib/studio-gate-html";

function deny(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.warn(`[auth] denied ${request.method} ${pathname}`);
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "未授权" },
      {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Yixi Studio", charset="UTF-8"' }
      }
    );
  }

  return new NextResponse(studioUnauthorizedHtml(), {
    status: 401,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  if (pathname === "/api/studio/session" && (method === "POST" || method === "DELETE")) {
    return NextResponse.next();
  }

  const authorized = isStudioAuthorized(request);
  if (pathname === "/studio" || pathname.startsWith("/studio/") || pathname.startsWith("/api/studio/")) {
    if (!authorized) return deny(request);
    return NextResponse.next();
  }

  const creating = pathname === "/api/episodes" && method === "POST";
  const generating = method === "POST" && /^\/api\/episodes\/[^/]+\/generate$/.test(pathname);
  if ((creating || generating) && !authorized && !isPublicCreateEnabled()) {
    return deny(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/studio", "/studio/:path*", "/api/studio/:path*", "/api/episodes", "/api/episodes/:path*"]
};
