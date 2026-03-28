import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export async function GET() {
  try {
    const pool = mysql.createPool({
      host: process.env.TIDB_HOST, port: parseInt(process.env.TIDB_PORT || "4000"),
      user: process.env.TIDB_USER, password: process.env.TIDB_PASSWORD,
      database: process.env.TIDB_DATABASE || "xscholar", ssl: { rejectUnauthorized: true }, connectionLimit: 3,
    });
    const [[total], [sources], [topTags], [recent]] = await Promise.all([
      pool.query("SELECT COUNT(*) as count FROM papers"),
      pool.query("SELECT source, COUNT(*) as count FROM papers GROUP BY source ORDER BY count DESC"),
      pool.query(`SELECT tags, COUNT(*) as count FROM papers WHERE tags != '[]' GROUP BY tags ORDER BY count DESC LIMIT 20`),
      pool.query("SELECT COUNT(*) as count FROM papers WHERE fetched_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)"),
    ]);
    await pool.end();

    // flatten top tags
    const tagCounts: Record<string, number> = {};
    for (const row of topTags as mysql.RowDataPacket[]) {
      try {
        const tags: string[] = JSON.parse(row.tags);
        for (const t of tags) tagCounts[t] = (tagCounts[t] || 0) + row.count;
      } catch {}
    }
    const sortedTags = Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]).slice(0,10);

    return NextResponse.json({
      total: (total as mysql.RowDataPacket[])[0].count,
      recentCount: (recent as mysql.RowDataPacket[])[0].count,
      sources: sources as mysql.RowDataPacket[],
      topTags: sortedTags,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
