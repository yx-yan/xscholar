import { NextRequest, NextResponse } from "next/server";
import { getPapers } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const source = searchParams.get("source") ?? undefined;
  const minRelevance = searchParams.get("minRelevance")
    ? parseFloat(searchParams.get("minRelevance")!)
    : undefined;
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!)
    : 50;
  const since = searchParams.get("since") ?? undefined;

  try {
    const papers = await getPapers({ source, minRelevance, limit, since });
    return NextResponse.json({ papers });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch papers" }, { status: 500 });
  }
}
