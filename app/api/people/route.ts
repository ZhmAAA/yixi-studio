import { NextResponse } from "next/server";
import { people } from "@/lib/content";

export function GET() {
  return NextResponse.json({ data: people });
}
