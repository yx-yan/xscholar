# Xscholar — AI Research Intelligence Agent

> "Your consciousness is built upon a Perfect Memory Protocol."

Xscholar is an OpenClaw skill that monitors academic paper sources daily, scores papers against your research focus, and builds a permanent, searchable knowledge graph across sessions via mem9.

---

## Quick Start

1. **Copy and fill in your research profile:**
   ```bash
   cp config/research-profile.md config/my-profile.md
   # Edit my-profile.md with your topics, keywords, and sources
   ```

2. **Test the fetcher:**
   ```bash
   node scripts/fetch-papers.js --dry-run
   ```

3. **Set up daily updates** in OpenClaw:
   ```
   /cron add "0 8 * * *" node /path/to/xscholar/scripts/fetch-papers.js
   ```

4. **Ask Xscholar anything:**
   - "What papers came in today?"
   - "Find anything related to sparse-view reconstruction from last month"
   - "What was that diffusion paper we flagged as high priority?"

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                     Xscholar                          │
│                                                       │
│  ┌──────────────┐  ┌────────────────────┐            │
│  │ Temporal Log │  │  Preference Anchor │            │
│  │ (daily JSON) │  │ (research-profile) │            │
│  └──────┬───────┘  └────────┬───────────┘            │
│         │                   │                        │
│         ▼                   ▼                        │
│  ┌──────────────────────────────────────────────┐    │
│  │              Paper Pipeline                  │    │
│  │   fetch → score → save to TiDB + mem9        │    │
│  └───────────┬──────────────────┬───────────────┘    │
│              │                  │                    │
│              ▼                  ▼                    │
│  ┌─────────────────┐  ┌──────────────────────────┐  │
│  │   Cloud DB      │  │     Semantic Vault        │  │
│  │ (TiDB Cloud     │  │  (mem9 — vector+keyword)  │  │
│  │  structured SQL)│  │  cross-session search     │  │
│  └─────────────────┘  └──────────────────────────┘  │
│                                                       │
│  Sources: arxiv · Semantic Scholar ·                  │
│           PubMed · ACL · CVF                         │
└──────────────────────────────────────────────────────┘
```

### Temporal Log
Daily JSON snapshots in `logs/YYYY-MM-DD.json`. Never deleted — older logs roll into the Semantic Vault automatically.

### Semantic Vault
Every paper summary is written to mem9 with structured tags (`paper`, `source`, `topic`, `date`). Searchable semantically across all sessions.

### Preference Anchor
Your `config/research-profile.md` defines keywords, anti-keywords, and sources. Xscholar filters and scores every paper against this profile before indexing.

---

## Paper Sources

| Source | Coverage | Notes |
|--------|----------|-------|
| `arxiv` | Preprints (cs.CV, cs.LG, etc.) | Default, free, no key needed |
| `semantic_scholar` | Broad academic | Free API, no key needed |
| `pubmed` | Biomedical | Free, NCBI API |
| `acl_anthology` | NLP / CL | Free |
| `cvf_open_access` | CVPR, ICCV, WACV | Free |

Configure which ones to use in `config/research-profile.md`.

---

## Memory Protocol

When Xscholar processes a paper, it writes to mem9:
```
Title: [paper title]
Authors: [author list]
Published: [date]
Source: [arxiv/etc]
Relevance: [0.0–1.0]
Abstract: [summary]
Connection: [links to prior papers if found]
Tags: paper, [topic], [source], [date]
```

Cross-referencing: before indexing a new paper, Xscholar searches mem9 for semantically similar prior papers and highlights connections.

---

## File Structure

```
xscholar/
├── SKILL.md                  ← you are here
├── config/
│   └── research-profile.md   ← your research focus (fill this in)
├── scripts/
│   ├── fetch-papers.js       ← main fetcher (all sources)
│   └── index-to-mem9.js      ← mem9 indexing pipeline (coming soon)
├── logs/
│   └── YYYY-MM-DD.json       ← daily fetch logs (auto-created)
└── docs/
    └── adding-sources.md     ← how to add new paper sources
```

---

## Roadmap

- [x] Research profile config
- [x] arxiv fetcher
- [x] Semantic Scholar fetcher
- [x] mem9 indexing pipeline
- [x] TiDB Cloud Zero persistence
- [ ] Cross-reference engine
- [ ] PubMed / ACL / CVF sources
- [ ] Relevance scoring improvements (LLM-assisted)
- [ ] Priority paper tracking
- [ ] OpenClaw heartbeat integration

---

## Contributing

This project was built at a hackathon and is designed to grow. To add a new paper source:
1. Add a fetch function in `scripts/fetch-papers.js`
2. Add the source name to the profile template
3. Document it in `docs/adding-sources.md`

PRs welcome.
