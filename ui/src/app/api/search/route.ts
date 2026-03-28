import { NextRequest, NextResponse } from "next/server";
import { getPapers } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? undefined;
  const source = searchParams.get("source") ?? undefined;
  const minRelevance = searchParams.get("minRelevance") ? parseFloat(searchParams.get("minRelevance")!) : undefined;
  const since = searchParams.get("since") ?? undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 200;

  try {
    const papers = await getPapers({ q, source, minRelevance, since, limit });
    return NextResponse.json({ papers });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
