import { headers } from "next/headers";
import { isStudioAuthorized } from "@/lib/studio-auth";

export async function isRequestAuthorized() {
  const headerList = await headers();
  const requestHeaders = new Headers();
  headerList.forEach((value, key) => requestHeaders.set(key, value));
  return isStudioAuthorized(new Request("http://studio.local", { headers: requestHeaders }));
}
