import { getPapers } from "@/lib/db";
import PaperCard from "@/components/PaperCard";

export const dynamic = "force-dynamic";

interface SearchParams {
  source?: string;
  minRelevance?: string;
  since?: string;
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const source = searchParams.source;
  const minRelevance = searchParams.minRelevance ? parseFloat(searchParams.minRelevance) : 0;
  const since = searchParams.since;

  let papers: import("@/lib/db").Paper[] = [];
  let error: string | null = null;

  try {
    papers = await getPapers({ source, minRelevance, limit: 100, since });
  } catch (e) {
    error = "Could not connect to database. Check your .env.local config.";
    console.error(e);
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span className="text-slate-400 text-sm font-medium">filter:</span>
        {[
          { label: "all", href: "/" },
          { label: "arxiv", href: "/?source=arxiv" },
          { label: "relevance ≥ 0.3", href: "/?minRelevance=0.3" },
          { label: "relevance ≥ 0.5", href: "/?minRelevance=0.5" },
        ].map((f) => (
          <a
            key={f.label}
            href={f.href}
            className="text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-colors"
          >
            {f.label}
          </a>
        ))}
        <span className="ml-auto text-slate-600 text-xs">{papers.length} papers</span>
      </div>

      {error && (
        <div className="border border-red-800 bg-red-900/20 rounded-lg p-4 text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      {!error && papers.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">📭</p>
          <p>No papers yet. Run <code className="bg-slate-800 px-1 rounded">node scripts/fetch-papers.js</code> to populate.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {papers.map((paper) => (
          <PaperCard key={paper.id} paper={paper} />
        ))}
      </div>
    </div>
  );
}
