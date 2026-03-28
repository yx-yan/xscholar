---
name: xscholar
description: >
  AI research intelligence agent. Monitors academic paper sources (arXiv, Semantic Scholar, etc.),
  scores papers against your research profile, and builds a searchable knowledge graph via mem9.
  Use when: user asks about recent papers, research topics, literature search, or wants to
  track a research area over time. Triggers on: "what papers", "recent research", "find papers",
  "literature on", "any new work on", "what's new in", daily heartbeat (runs fetch if due).
metadata:
  openclaw:
    emoji: "📚"
    requires:
      env: [MEM9_API_KEY]
      optionalEnv: [TIDB_HOST, TIDB_USER, TIDB_PASSWORD]
---

# Xscholar Skill

Xscholar turns your OpenClaw agent into a research intelligence layer.
It fetches papers, scores them, cross-references them via mem9, and answers
questions across sessions.

---

## Setup (one-time)

```bash
cd xscholar

# 1. Copy and fill in your env
cp .env.example .env
# Set MEM9_API_KEY (required)
# Set TIDB_* vars (optional, for SQL persistence)

# 2. Fill in your research profile
nano config/research-profile.md

# 3. Run setup (creates DB table, registers cron)
node scripts/setup.js
```

That's it. Xscholar will fetch papers every day at 08:00 UTC and index them into mem9.

---

## Agent Usage

After setup, use natural language:

- *"What papers came in today?"*
- *"Find me papers on diffusion models for medical imaging"*
- *"Summarize this week's research in my focus areas"*
- *"Any new work on sparse-view CT reconstruction?"*
- *"What was that transformer segmentation paper from last month?"*

The agent reads your research profile and queries mem9 to answer these.

---

## How to Answer Research Questions

When the user asks about papers or research:

1. Run `node scripts/query.js --q "<their question>" --limit 5`
2. Parse the JSON output (array of paper objects with title, abstract, relevance, url)
3. Synthesize a natural language answer — don't dump raw results
4. If nothing relevant found in DB, offer to run a fresh fetch

---

## Heartbeat Integration

Add to `HEARTBEAT.md` to enable proactive updates:

```markdown
- Check if xscholar fetch is due (last run > 20h ago): node scripts/query.js --status
  If due: node scripts/fetch-papers.js && node scripts/index-to-mem9.js
  If new high-relevance papers found (score >= 0.6): notify user
```

---

## Scripts

| Script | Purpose |
|--------|---------|
| `setup.js` | One-time setup: create DB table, register cron |
| `fetch-papers.js` | Fetch papers from configured sources, save to TiDB + logs |
| `index-to-mem9.js` | Cross-reference and index today's papers into mem9 |
| `query.js` | Query papers by keyword/topic/date from TiDB or mem9 |

---

## Configuration

Edit `config/research-profile.md` to set:
- Your research focus and keywords
- Which sources to monitor (arxiv, Semantic Scholar, etc.)
- Min relevance threshold
- Max papers per fetch

---

## Memory Architecture

```
fetch-papers.js
      │
      ▼
  TiDB Cloud ←──── structured SQL queries (query.js)
      │
      ▼
index-to-mem9.js
      │
      ├── cross-reference against existing mem9 memories
      ├── detect emerging research threads
      ├── store paper + connections in mem9
      └── update research momentum summary
            │
            ▼
         mem9 ←──── semantic search ("find papers on X")
```

Two persistence layers that complement each other:
- **TiDB** — structured, filterable, full paper data
- **mem9** — semantic search, cross-session context, research threads
