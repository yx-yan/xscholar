#!/usr/bin/env node
/**
 * Xscholar Paper Fetcher
 * Fetches papers from configured sources, scores them against research profile,
 * and indexes summaries into mem9.
 *
 * Usage: node fetch-papers.js [--dry-run] [--source arxiv]
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const db = require("./db");

const PROFILE_PATH = path.join(__dirname, "../config/research-profile.md");
const LOG_DIR = path.join(__dirname, "../logs");

// ─── Helpers ────────────────────────────────────────────────────────────────

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
      res.on("error", reject);
    }).on("error", reject);
  });
}

function parseProfile(profileText) {
  const keywords = [];
  const antiKeywords = [];
  const categories = [];
  const sources = [];

  let inKeywords = false, inAnti = false, inCategories = false, inSources = false;

  for (const line of profileText.split("\n")) {
    const trimmed = line.trim();

    if (trimmed === "## Keywords") { inKeywords = true; inAnti = false; inCategories = false; inSources = false; continue; }
    if (trimmed === "## Anti-keywords") { inAnti = true; inKeywords = false; inCategories = false; inSources = false; continue; }
    if (trimmed === "## arxiv Categories") { inCategories = true; inKeywords = false; inAnti = false; inSources = false; continue; }
    if (trimmed === "## Paper Sources") { inSources = true; inKeywords = false; inAnti = false; inCategories = false; continue; }
    if (trimmed.startsWith("##")) { inKeywords = false; inAnti = false; inCategories = false; inSources = false; continue; }

    if (trimmed.startsWith("#") || trimmed === "```" || trimmed === "```yaml" || !trimmed) continue;

    if (inKeywords) keywords.push(trimmed.toLowerCase());
    if (inAnti) antiKeywords.push(trimmed.toLowerCase());
    if (inCategories) categories.push(trimmed.split(/\s/)[0]);
    if (inSources) {
      const m = trimmed.match(/^-\s+(\w+)/);
      if (m) sources.push(m[1]);
    }
  }

  return { keywords, antiKeywords, categories, sources: sources.length ? sources : ["arxiv"] };
}

function scoreRelevance(paper, profile) {
  const text = `${paper.title} ${paper.abstract}`.toLowerCase();
  let score = 0;

  for (const kw of profile.keywords) {
    if (text.includes(kw)) score += 0.2;
  }
  for (const kw of profile.antiKeywords) {
    if (text.includes(kw)) score -= 0.15;
  }

  return Math.min(1.0, Math.max(0.0, score));
}

// ─── Sources ────────────────────────────────────────────────────────────────

async function fetchArxiv(categories, maxResults = 20) {
  const cat = categories.join("+OR+cat:");
  const url = `https://export.arxiv.org/api/query?search_query=cat:${cat}&sortBy=submittedDate&sortOrder=descending&max_results=${maxResults}`;
  const { body } = await httpsGet(url);

  const papers = [];
  const entries = body.split("<entry>");
  entries.shift(); // remove header

  for (const entry of entries) {
    const title = (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.replace(/\s+/g, " ").trim();
    const abstract = (entry.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1]?.replace(/\s+/g, " ").trim();
    const id = (entry.match(/<id>([\s\S]*?)<\/id>/) || [])[1]?.trim();
    const published = (entry.match(/<published>([\s\S]*?)<\/published>/) || [])[1]?.trim();
    const authors = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)].map(m => m[1].trim());

    if (title && abstract && id) {
      papers.push({ title, abstract, id, published, authors, source: "arxiv" });
    }
  }

  return papers;
}

async function fetchSemanticScholar(keywords, limit = 20) {
  const query = encodeURIComponent(keywords.slice(0, 3).join(" "));
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${query}&limit=${limit}&fields=title,abstract,year,authors,externalIds,publicationDate`;
  const { body } = await httpsGet(url);

  try {
    const data = JSON.parse(body);
    return (data.data || []).map(p => ({
      title: p.title,
      abstract: p.abstract || "",
      id: p.paperId,
      published: p.publicationDate,
      authors: (p.authors || []).map(a => a.name),
      source: "semantic_scholar"
    }));
  } catch {
    return [];
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const forcedSource = process.argv.includes("--source")
    ? process.argv[process.argv.indexOf("--source") + 1]
    : null;

  if (!fs.existsSync(PROFILE_PATH)) {
    console.error("No research profile found at", PROFILE_PATH);
    console.error("Copy config/research-profile.md and fill it in.");
    process.exit(1);
  }

  const profileText = fs.readFileSync(PROFILE_PATH, "utf8");
  const profile = parseProfile(profileText);

  console.log("Profile loaded:", profile.keywords.length, "keywords,", profile.sources.join(", "));

  const sources = forcedSource ? [forcedSource] : profile.sources;
  let allPapers = [];

  for (const source of sources) {
    console.log(`Fetching from ${source}...`);
    try {
      if (source === "arxiv") {
        const papers = await fetchArxiv(profile.categories.length ? profile.categories : ["cs.CV", "cs.LG"]);
        allPapers.push(...papers);
      } else if (source === "semantic_scholar") {
        const papers = await fetchSemanticScholar(profile.keywords);
        allPapers.push(...papers);
      } else {
        console.warn(`Source "${source}" not yet implemented, skipping.`);
      }
    } catch (err) {
      console.error(`Failed to fetch from ${source}:`, err.message);
    }
  }

  // Score and filter
  const scored = allPapers
    .map(p => ({ ...p, relevanceScore: scoreRelevance(p, profile) }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  const minScore = 0.0; // Set to profile value when parsing is wired
  const filtered = scored.filter(p => p.relevanceScore >= minScore);

  console.log(`\nFetched ${allPapers.length} papers → ${filtered.length} above threshold\n`);

  // Output
  const timestamp = new Date().toISOString().slice(0, 10);
  const output = {
    fetchedAt: new Date().toISOString(),
    profile: { keywords: profile.keywords, sources },
    papers: filtered.map(p => ({
      title: p.title,
      authors: p.authors?.slice(0, 3).join(", ") + (p.authors?.length > 3 ? " et al." : ""),
      published: p.published,
      source: p.source,
      id: p.id,
      relevanceScore: Math.round(p.relevanceScore * 100) / 100,
      abstract: p.abstract?.slice(0, 500) + (p.abstract?.length > 500 ? "..." : ""),
    }))
  };

  if (!dryRun) {
    // Save to local log
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    const logFile = path.join(LOG_DIR, `${timestamp}.json`);
    fs.writeFileSync(logFile, JSON.stringify(output, null, 2));
    console.log(`Saved to ${logFile}`);

    // Save to TiDB Cloud
    try {
      const papersToSave = output.papers.map(p => ({
        ...p,
        relevanceScore: p.relevanceScore,
        tags: profile.keywords.filter(kw =>
          `${p.title} ${p.abstract}`.toLowerCase().includes(kw)
        ).slice(0, 10),
      }));
      await db.savePapers(papersToSave);
      console.log(`Saved ${papersToSave.length} papers to TiDB Cloud`);
    } catch (err) {
      console.error('TiDB save failed (non-fatal):', err.message);
    } finally {
      await db.close();
    }

    // Index to mem9
    console.log('\nIndexing to mem9...');
    try {
      const { execSync } = require('child_process');
      execSync(`node ${path.join(__dirname, 'index-to-mem9.js')} --date ${timestamp} --min-relevance 0.2`, {
        stdio: 'inherit',
        env: process.env,
      });
    } catch (err) {
      console.error('mem9 indexing failed (non-fatal):', err.message);
    }
  }

  // Print top 5 for review
  console.log("=== Top Papers ===");
  for (const p of output.papers.slice(0, 5)) {
    console.log(`\n[${p.relevanceScore}] ${p.title}`);
    console.log(`  ${p.authors} · ${p.published?.slice(0, 10)} · ${p.source}`);
    console.log(`  ${p.abstract?.slice(0, 150)}...`);
  }

  return output;
}

main().catch(console.error);
