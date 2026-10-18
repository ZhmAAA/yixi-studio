import { NextResponse } from "next/server";
import { topics } from "@/lib/content";

export function GET() {
  return NextResponse.json({ data: topics });
}
