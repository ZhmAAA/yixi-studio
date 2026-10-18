import { createHmac, timingSafeEqual } from "node:crypto";

export const STUDIO_COOKIE = "yixi_studio";
const SESSION_PAYLOAD = "yixi-studio-session-v1";

export function getStudioPassword() {
  return process.env.STUDIO_PASSWORD?.trim() ?? "";
}

export function isPublicCreateEnabled() {
  return process.env.ALLOW_PUBLIC_CREATE === "true";
}

export function studioSessionToken(password: string) {
  return createHmac("sha256", password).update(SESSION_PAYLOAD).digest("base64url");
}

export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    return decodeURIComponent(part.slice(index + 1).trim());
  }
  return undefined;
}

export function isStudioAuthorized(request: Request) {
  const password = getStudioPassword();
  if (!password) return false;

  const header = request.headers.get("authorization") ?? "";
  if (header.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    if (token && safeEqual(token, password)) return true;
  }

  if (header.toLowerCase().startsWith("basic ")) {
    const decoded = Buffer.from(header.slice(6).trim(), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    const pass = separator >= 0 ? decoded.slice(separator + 1) : "";
    if (pass && safeEqual(pass, password)) return true;
  }

  const apiKey = request.headers.get("x-studio-key");
  if (apiKey && safeEqual(apiKey, password)) return true;

  const cookie = readCookie(request.headers.get("cookie"), STUDIO_COOKIE);
  return Boolean(cookie && safeEqual(cookie, studioSessionToken(password)));
}
