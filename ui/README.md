# Xscholar UI

Dark-themed research paper feed backed by TiDB Cloud Zero.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- mysql2

## Setup

```bash
cd ui
cp .env.local.example .env.local
# Fill in your TiDB credentials
npm install
npm run dev
```

Open http://localhost:3000

## Pages

- `/` — Paper feed, sorted by relevance. Filter by source or relevance threshold.
- `/paper/[id]` — Full paper detail with abstract, metadata, and link to original.

## API

- `GET /api/papers` — JSON list of papers
  - `?source=arxiv`
  - `?minRelevance=0.3`
  - `?limit=20`
  - `?since=2026-03-01`
