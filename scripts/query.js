#!/usr/bin/env node
/**
 * Xscholar Query — used by the OpenClaw agent to answer research questions
 *
 * Usage:
 *   node query.js --q "diffusion models for segmentation" --limit 5
 *   node query.js --source arxiv --minRelevance 0.5
 *   node query.js --since 2026-03-01
 *   node query.js --status   (check last fetch time)
 *
 * Output: JSON array of papers, or status object
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const args = process.argv.slice(2);
const get = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};
const has = (flag) => args.includes(flag);

const LOG_DIR = path.join(__dirname, '../logs');

// --status: check last fetch time and paper count
if (has('--status')) {
  const logs = fs.existsSync(LOG_DIR)
    ? fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.json')).sort().reverse()
    : [];

  if (!logs.length) {
    console.log(JSON.stringify({ lastFetch: null, paperCount: 0, status: 'never_run' }));
    process.exit(0);
  }

  const latest = logs[0];
  const data = JSON.parse(fs.readFileSync(path.join(LOG_DIR, latest), 'utf8'));
  const lastFetch = data.fetchedAt || latest.replace('.json', '');
  const hoursSince = (Date.now() - new Date(lastFetch).getTime()) / 3_600_000;

  console.log(JSON.stringify({
    lastFetch,
    paperCount: data.papers?.length || 0,
    hoursSince: Math.round(hoursSince),
    fetchDue: hoursSince > 20,
    status: 'ok',
  }));
  process.exit(0);
}

async function queryFromDB(opts) {
  const missing = ['TIDB_HOST', 'TIDB_USER', 'TIDB_PASSWORD'].filter(k => !process.env[k]);
  if (missing.length) return null; // fall back to logs

  const mysql = require('mysql2/promise');
  const pool = mysql.createPool({
    host: process.env.TIDB_HOST,
    port: parseInt(process.env.TIDB_PORT || '4000'),
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DATABASE || 'xscholar',
    ssl: { rejectUnauthorized: true },
    connectionLimit: 3,
  });

  try {
    const { q, source, minRelevance, limit, since } = opts;
    const conditions = [];
    const params = [];

    // Keyword search in title + abstract
    if (q) {
      conditions.push('(title LIKE ? OR abstract LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (source) { conditions.push('source = ?'); params.push(source); }
    if (minRelevance != null) { conditions.push('relevance >= ?'); params.push(minRelevance); }
    if (since) { conditions.push('published_at >= ?'); params.push(since); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT id, title, authors, abstract, url, source, published_at, relevance, tags
       FROM papers ${where}
       ORDER BY relevance DESC, published_at DESC
       LIMIT ?`,
      [...params, limit || 10]
    );
    return rows;
  } finally {
    await pool.end();
  }
}

function queryFromLogs(opts) {
  if (!fs.existsSync(LOG_DIR)) return [];
  const { q, source, minRelevance, limit, since } = opts;

  const logFiles = fs.readdirSync(LOG_DIR)
    .filter(f => f.endsWith('.json'))
    .sort().reverse()
    .slice(0, 7); // last 7 days

  const papers = [];
  for (const file of logFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(LOG_DIR, file), 'utf8'));
    for (const p of (data.papers || [])) {
      if (source && p.source !== source) continue;
      if (minRelevance != null && (p.relevanceScore || 0) < minRelevance) continue;
      if (since && (p.published || '') < since) continue;
      if (q) {
        const text = `${p.title} ${p.abstract || ''}`.toLowerCase();
        if (!q.toLowerCase().split(' ').some(w => text.includes(w))) continue;
      }
      papers.push({
        id: p.id,
        title: p.title,
        authors: Array.isArray(p.authors) ? p.authors.join(', ') : p.authors,
        abstract: p.abstract,
        url: p.url || p.id,
        source: p.source,
        published_at: (p.published || '').slice(0, 10),
        relevance: p.relevanceScore || 0,
        tags: p.tags || [],
      });
    }
  }

  papers.sort((a, b) => b.relevance - a.relevance);
  return papers.slice(0, limit || 10);
}

async function main() {
  const opts = {
    q: get('--q'),
    source: get('--source'),
    minRelevance: get('--minRelevance') ? parseFloat(get('--minRelevance')) : null,
    limit: get('--limit') ? parseInt(get('--limit')) : 10,
    since: get('--since'),
  };

  let results = await queryFromDB(opts);
  if (!results) {
    results = queryFromLogs(opts);
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
