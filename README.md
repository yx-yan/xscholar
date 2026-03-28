# 📚 Xscholar

**An OpenClaw skill that turns your AI agent into a research intelligence layer.**

Xscholar monitors academic paper sources daily, scores papers against your research focus, and builds a permanent searchable knowledge graph — so you can ask your agent questions like *"what's new in diffusion models this week?"* and get real answers backed by actual papers.

> Built at a hackathon. Designed to grow.

---

## How it works

```
Your research profile
        ↓
Fetch papers (arXiv, Semantic Scholar, ...)
        ↓
Score by relevance → save to TiDB Cloud
        ↓
Cross-reference + index into mem9
        ↓
Ask your agent anything, across sessions
```

Three memory layers:
- **TiDB Cloud** — structured SQL, full paper data, filterable by source/date/score
- **mem9** — semantic vector search, cross-session context, research thread detection
- **Daily logs** — raw JSON snapshots, fallback when DB isn't configured

---

## Install

Requires [OpenClaw](https://openclaw.ai) with the mem9 plugin configured.

```bash
git clone https://github.com/yx-yan/xscholar
cd xscholar
cp .env.example .env
```

Edit `.env`:
```env
MEM9_API_KEY=your_mem9_api_key        # required
TIDB_HOST=...                          # optional, for SQL persistence
TIDB_USER=...
TIDB_PASSWORD=...
TIDB_DATABASE=xscholar
```

Then run setup:
```bash
node scripts/setup.js
```

---

## Configure

Edit `config/research-profile.md` — set your keywords, topics, sources, and schedule.

---

## Run

```bash
# Fetch today's papers
node scripts/fetch-papers.js

# Index into mem9 (cross-reference + intelligence layer)
node scripts/index-to-mem9.js

# Query from your agent
node scripts/query.js --q "sparse-view reconstruction" --limit 5
node scripts/query.js --status   # check last fetch time
```

---

## Agent usage

Once installed as an OpenClaw skill, ask your agent:

- *"What papers came in today?"*
- *"Find me recent work on diffusion models for segmentation"*
- *"Any high-relevance papers from this week?"*
- *"What was that 3D transformer paper from last month?"*
- *"Summarize what's happening in my research area"*

The agent uses `query.js` to fetch results and synthesizes natural language answers.

---

## Heartbeat (proactive updates)

Add to your `HEARTBEAT.md` to get proactive notifications:

```markdown
- Check xscholar status: node xscholar/scripts/query.js --status
  If fetchDue is true: run fetch + index pipeline
  If new papers with relevance >= 0.6: notify user
```

---

## Web UI

A Next.js dashboard is included in `ui/`:

```bash
cd ui
cp .env.local.example .env.local  # add TiDB creds
npm install && npm run dev
# → http://localhost:3000
```

---

## Sources

| Source | Status |
|--------|--------|
| arXiv | ✅ |
| Semantic Scholar | ✅ |
| PubMed | coming soon |
| ACL Anthology | coming soon |
| CVF Open Access | coming soon |

---

## License

MIT — built to be forked, extended, and made your own.
