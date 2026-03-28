# 🧠 Xscholar

**AI Research Intelligence Agent for OpenClaw**

Xscholar monitors academic paper sources daily, scores papers against your research focus, and builds a permanent searchable knowledge graph — so you never lose a paper again.

> Built at a hackathon. Designed to grow.

---

## What it does

- 📰 **Fetches papers daily** from arxiv, Semantic Scholar, PubMed, ACL, and more
- 🎯 **Scores relevance** against your research profile (keywords, topics, anti-keywords)
- 🧠 **Indexes everything** into mem9 — searchable semantically across all sessions
- 🔗 **Cross-references** new papers against your entire archive
- 💬 **Answers questions** like "What was that sparse-view CT paper from last month?"

## Requirements

- [OpenClaw](https://github.com/openclaw/openclaw) with mem9 plugin configured
- Node.js 18+

## Install

```bash
git clone https://github.com/YOUR_USERNAME/xscholar
cd xscholar
```

Then drop the folder into your OpenClaw workspace or skills directory.

## Setup

```bash
# 1. Fill in your research profile
cp config/research-profile.md config/my-profile.md
nano config/my-profile.md

# 2. Test the fetcher
node scripts/fetch-papers.js --dry-run

# 3. Schedule daily updates (in OpenClaw)
# /cron add "0 8 * * *" node /path/to/xscholar/scripts/fetch-papers.js
```

## Usage

Once running, just ask:

- *"What papers came in today?"*
- *"Find papers related to diffusion models for medical imaging"*
- *"What was that 3D U-Net paper from two weeks ago?"*
- *"Show me everything tagged high-priority"*

## Architecture

```
Sources → Fetcher → Relevance Scorer → mem9 Vault
                                           ↑
                              Cross-Reference Engine
```

Three memory layers:
1. **Temporal Log** — daily JSON snapshots, never deleted
2. **Semantic Vault** — mem9 vector index, searchable by concept
3. **Preference Anchor** — your research profile, drives all filtering

## Sources

| Source | Command |
|--------|---------|
| arxiv | default |
| Semantic Scholar | `--source semantic_scholar` |
| PubMed | coming soon |
| ACL Anthology | coming soon |
| CVF Open Access | coming soon |

## License

MIT
