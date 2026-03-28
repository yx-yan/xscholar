/**
 * TiDB Cloud Zero connection helper for Xscholar
 * Credentials loaded from environment or hardcoded fallback (TOOLS.md)
 */

const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.TIDB_HOST,
  port: parseInt(process.env.TIDB_PORT || '4000'),
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE || 'xscholar',
  ssl: { rejectUnauthorized: true },
  connectTimeout: 10000,
};

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({ ...DB_CONFIG, waitForConnections: true, connectionLimit: 5 });
  }
  return pool;
}

/**
 * Upsert a batch of papers into TiDB.
 * Uses INSERT ... ON DUPLICATE KEY UPDATE to avoid re-inserting known papers.
 * @param {Array} papers - scored paper objects
 */
async function savePapers(papers) {
  if (!papers.length) return;
  const db = getPool();

  const values = papers.map(p => [
    p.id,
    p.title?.slice(0, 2048) || '',
    Array.isArray(p.authors) ? p.authors.join(', ').slice(0, 1024) : (p.authors || ''),
    p.abstract?.slice(0, 8192) || '',
    p.url || p.id || '',
    p.source || 'unknown',
    p.published ? p.published.slice(0, 10) : null,
    p.relevanceScore ?? 0.0,
    JSON.stringify(p.tags || []),
    JSON.stringify({ id: p.id, source: p.source }),
  ]);

  const placeholders = values.map(() => '(?,?,?,?,?,?,?,?,?,?)').join(',');
  const flat = values.flat();

  await db.query(`
    INSERT INTO papers
      (id, title, authors, abstract, url, source, published_at, relevance, tags, raw)
    VALUES ${placeholders}
    ON DUPLICATE KEY UPDATE
      relevance = VALUES(relevance),
      fetched_at = CURRENT_TIMESTAMP
  `, flat);
}

/**
 * Query papers from TiDB
 */
async function queryPapers({ source, minRelevance, limit = 20, since } = {}) {
  const db = getPool();
  const conditions = [];
  const params = [];

  if (source) { conditions.push('source = ?'); params.push(source); }
  if (minRelevance != null) { conditions.push('relevance >= ?'); params.push(minRelevance); }
  if (since) { conditions.push('published_at >= ?'); params.push(since); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await db.query(
    `SELECT id, title, authors, abstract, url, source, published_at, relevance, tags
     FROM papers ${where}
     ORDER BY relevance DESC, published_at DESC
     LIMIT ?`,
    [...params, limit]
  );
  return rows;
}

async function close() {
  if (pool) { await pool.end(); pool = null; }
}

module.exports = { savePapers, queryPapers, close };
