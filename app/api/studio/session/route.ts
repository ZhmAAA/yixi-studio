import { NextResponse } from "next/server";
import { STUDIO_COOKIE, getStudioPassword, safeEqual, studioSessionToken } from "@/lib/studio-auth";

function sessionCookie(token: string, request: Request) {
  const secure = new URL(request.url).protocol === "https:";
  return {
    name: STUDIO_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 14
    }
  };
}

export async function POST(request: Request) {
  const password = getStudioPassword();
  if (!password) {
    console.warn("[auth] denied POST /api/studio/session");
    return NextResponse.json({ error: "工作台未配置访问密码" }, { status: 401 });
  }

  let submitted = "";
  try {
    const body = await request.json() as { password?: unknown };
    submitted = typeof body.password === "string" ? body.password : "";
  } catch {
    submitted = "";
  }

  if (!submitted || !safeEqual(submitted, password)) {
    console.warn("[auth] denied POST /api/studio/session");
    return NextResponse.json({ error: "密码不正确" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  const cookie = sessionCookie(studioSessionToken(password), request);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}

export async function DELETE(request: Request) {
  const response = NextResponse.json({ ok: true });
  const cookie = sessionCookie("", request);
  response.cookies.set(cookie.name, "", { ...cookie.options, maxAge: 0 });
  return response;
}
