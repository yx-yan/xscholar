/**
 * Xscholar mem9 Intelligence Engine
 *
 * Stores research context, not paper dumps.
 * For each batch of papers:
 *   1. Cross-reference: find connections to prior work already in mem9
 *   2. Store papers WITH their connections (not in isolation)
 *   3. Detect emerging research threads (topic clusters)
 *   4. Update a living "research momentum" summary
 *
 * Usage: node index-to-mem9.js [--date YYYY-MM-DD] [--min-relevance 0.2]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const MEM9_API_URL = process.env.MEM9_API_URL || 'https://api.mem9.ai';
const MEM9_API_KEY = process.env.MEM9_API_KEY;
const LOG_DIR = path.join(__dirname, '../logs');

// ─── mem9 API ────────────────────────────────────────────────────────────────

function apiRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, MEM9_API_URL);
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'X-API-Key': MEM9_API_KEY,
        'Content-Type': 'application/json',
        'User-Agent': 'xscholar/1.0',
        'Accept': '*/*',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function searchMem9(query, { limit = 5, tags } = {}) {
  let qs = `/v1alpha2/mem9s/memories?q=${encodeURIComponent(query)}&limit=${limit}`;
  if (tags) qs += `&tags=${encodeURIComponent(tags)}`;
  const { body } = await apiRequest('GET', qs);
  return body.memories || body.data || [];
}

async function saveMem9(content, { tags = [], memoryType = 'insight', source = 'xscholar' } = {}) {
  const { status, body } = await apiRequest('POST', '/v1alpha2/mem9s/memories', {
    content,
    memory_type: memoryType,
    source,
    tags,
  });
  if (status !== 200 && status !== 201 && status !== 202) {
    throw new Error(`mem9 save failed: ${status} ${JSON.stringify(body)}`);
  }
  return body;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Topic extraction ────────────────────────────────────────────────────────

const RESEARCH_TOPICS = [
  'diffusion', 'transformer', 'attention', 'segmentation', 'detection',
  'generation', 'reconstruction', '3d', 'video', 'multimodal', 'vision',
  'language', 'llm', 'neural', 'contrastive', 'reinforcement', 'robotic',
  'autonomous', 'flow', 'depth', 'pose', 'tracking', 'retrieval',
  'embedding', 'fine-tuning', 'zero-shot', 'few-shot', 'hallucination',
  'grounding', 'reasoning', 'editing', 'synthesis', 'compression',
];

function extractTopics(text) {
  const lower = text.toLowerCase();
  return [...new Set(RESEARCH_TOPICS.filter(t => lower.includes(t)))];
}

// ─── Cross-reference ─────────────────────────────────────────────────────────

const CONNECTION_THRESHOLD = 0.4; // mem9 score above this = meaningful connection

async function findConnections(paper) {
  // Search by title keywords + abstract snippet
  const query = paper.title.split(' ').slice(0, 8).join(' ');
  const results = await searchMem9(query, { limit: 5, tags: 'paper' });
  return results.filter(r => r.score >= CONNECTION_THRESHOLD);
}

// ─── Store a paper with context ───────────────────────────────────────────────

async function indexPaper(paper, connections) {
  const topics = extractTopics(`${paper.title} ${paper.abstract || ''}`);

  let connectionBlock = '';
  if (connections.length > 0) {
    const refs = connections
      .map(c => {
        // Pull title line from stored content
        const titleLine = (c.content || '').split('\n').find(l => l.startsWith('Title:'));
        return titleLine ? `  → ${titleLine.replace('Title: ', '')}` : null;
      })
      .filter(Boolean);
    if (refs.length) {
      connectionBlock = `\nConnects to prior work:\n${refs.join('\n')}`;
    }
  }

  const content = `Title: ${paper.title}
Authors: ${Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors || 'Unknown'}
Published: ${(paper.published || paper.published_at || '').slice(0, 10)}
Source: ${paper.source}
Relevance: ${paper.relevanceScore ?? paper.relevance ?? 0}
Topics: ${topics.join(', ') || 'general'}
Abstract: ${(paper.abstract || '').slice(0, 500)}${connectionBlock}`;

  await saveMem9(content, {
    tags: ['paper', paper.source, ...topics.slice(0, 5)],
  });

  return topics;
}

// ─── Research thread detection ────────────────────────────────────────────────

async function detectThreads(papers, date) {
  // Count topic frequency across today's papers
  const topicCounts = {};
  for (const p of papers) {
    const topics = extractTopics(`${p.title} ${p.abstract || ''}`);
    for (const t of topics) {
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    }
  }

  // Topics appearing in 3+ papers = emerging thread
  const hotTopics = Object.entries(topicCounts)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]);

  if (!hotTopics.length) return;

  for (const [topic, count] of hotTopics) {
    const relatedPapers = papers
      .filter(p => extractTopics(`${p.title} ${p.abstract || ''}`).includes(topic))
      .map(p => `  - ${p.title?.slice(0, 80)}`)
      .join('\n');

    const content = `Research thread detected [${date}]: ${topic}
${count} papers on this topic today, suggesting active development.

Papers:
${relatedPapers}

This thread is worth tracking — check back in coming days for follow-up work.`;

    await saveMem9(content, {
      tags: ['thread', 'research-momentum', topic, date],
      memoryType: 'insight',
    });

    console.log(`  📌 Thread: "${topic}" (${count} papers)`);
    await delay(200);
  }
}

// ─── Research momentum summary ────────────────────────────────────────────────

async function updateMomentumSummary(papers, date, allTopics) {
  // Top topics by frequency
  const topicFreq = {};
  for (const t of allTopics.flat()) {
    topicFreq[t] = (topicFreq[t] || 0) + 1;
  }
  const topTopics = Object.entries(topicFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([t, n]) => `${t} (${n})`)
    .join(', ');

  const avgRelevance = papers.length
    ? (papers.reduce((s, p) => s + (p.relevanceScore || p.relevance || 0), 0) / papers.length).toFixed(2)
    : 0;

  const content = `Research momentum update [${date}]
Papers indexed: ${papers.length}
Average relevance: ${avgRelevance}
Active topics: ${topTopics}

Top papers today:
${papers.slice(0, 3).map(p => `  [${p.relevanceScore ?? p.relevance ?? 0}] ${p.title?.slice(0, 80)}`).join('\n')}

This snapshot helps track how research interests are evolving over time.`;

  await saveMem9(content, {
    tags: ['momentum', 'daily-summary', date],
    memoryType: 'insight',
  });

  console.log(`  📊 Momentum summary saved`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const dateArg = process.argv.includes('--date')
    ? process.argv[process.argv.indexOf('--date') + 1]
    : new Date().toISOString().slice(0, 10);

  const minRelevance = process.argv.includes('--min-relevance')
    ? parseFloat(process.argv[process.argv.indexOf('--min-relevance') + 1])
    : 0.2;

  const logFile = path.join(LOG_DIR, `${dateArg}.json`);
  if (!fs.existsSync(logFile)) {
    console.error(`No log file for ${dateArg} at ${logFile}`);
    process.exit(1);
  }

  const log = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  const papers = log.papers.filter(p => (p.relevanceScore ?? 0) >= minRelevance);

  console.log(`\n🧠 Xscholar Intelligence Engine`);
  console.log(`   ${papers.length} papers to index (min relevance: ${minRelevance})\n`);

  // Phase 1: Cross-reference and index each paper
  console.log('Phase 1: Cross-referencing and indexing papers...');
  const allTopics = [];
  let indexed = 0, connected = 0, failed = 0;

  for (const paper of papers) {
    try {
      const connections = await findConnections(paper);
      const topics = await indexPaper(paper, connections);
      allTopics.push(topics);

      const connNote = connections.length ? ` (${connections.length} connection${connections.length > 1 ? 's' : ''})` : '';
      console.log(`  ✓ [${paper.relevanceScore}] ${paper.title?.slice(0, 55)}...${connNote}`);

      if (connections.length) connected++;
      indexed++;
      await delay(250);
    } catch (err) {
      console.error(`  ✗ ${paper.title?.slice(0, 50)} — ${err.message}`);
      failed++;
    }
  }

  // Phase 2: Detect research threads
  if (papers.length >= 3) {
    console.log('\nPhase 2: Detecting research threads...');
    await detectThreads(papers, dateArg);
  }

  // Phase 3: Update momentum summary
  console.log('\nPhase 3: Updating research momentum...');
  await updateMomentumSummary(papers, dateArg, allTopics);

  console.log(`\n✅ Done: ${indexed} indexed, ${connected} with connections, ${failed} failed`);
}

main().catch(console.error);
