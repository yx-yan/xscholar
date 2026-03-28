import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.TIDB_HOST,
  port: parseInt(process.env.TIDB_PORT || "4000"),
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE || "xscholar",
  ssl: { rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 5,
});

export interface Paper {
  id: string;
  title: string;
  authors: string;
  abstract: string;
  url: string;
  source: string;
  published_at: string | Date | null;
  relevance: number;
  tags: string;
  fetched_at?: string;
}

export interface QueryOptions {
  q?: string;
  source?: string;
  minRelevance?: number;
  limit?: number;
  since?: string;
}

export async function getPapers(opts: QueryOptions = {}): Promise<Paper[]> {
  const { q, source, minRelevance, limit = 50, since } = opts;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (q) { conditions.push("(title LIKE ? OR abstract LIKE ? OR authors LIKE ?)"); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (source) { conditions.push("source = ?"); params.push(source); }
  if (minRelevance != null) { conditions.push("relevance >= ?"); params.push(minRelevance); }
  if (since) { conditions.push("published_at >= ?"); params.push(since); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT id, title, authors, abstract, url, source, published_at, relevance, tags, fetched_at
     FROM papers ${where}
     ORDER BY relevance DESC, published_at DESC
     LIMIT ?`,
    [...params, limit]
  );
  return rows as Paper[];
}

export async function getPaperById(id: string): Promise<Paper | null> {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT id, title, authors, abstract, url, source, published_at, relevance, tags, fetched_at
     FROM papers WHERE id = ? LIMIT 1`,
    [id]
  );
  return (rows[0] as Paper) ?? null;
}
