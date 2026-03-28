import { getPaperById } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function Tags({ raw }: { raw: string }) {
  let tags: string[] = [];
  try { tags = JSON.parse(raw); } catch { tags = []; }
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => (
        <span key={t} className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-slate-700">
          {t}
        </span>
      ))}
    </div>
  );
}

export default async function PaperPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  const paper = await getPaperById(id);

  if (!paper) notFound();

  const scoreColor =
    paper.relevance >= 0.6 ? "text-emerald-400" :
    paper.relevance >= 0.3 ? "text-amber-400" :
    "text-slate-400";

  return (
    <div className="max-w-3xl">
      <Link href="/" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
        ← back to feed
      </Link>

      <h1 className="text-xl font-semibold text-white mt-4 leading-snug">{paper.title}</h1>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-slate-500">
        <span>{paper.authors}</span>
        {paper.published_at && <span>{paper.published_at.slice(0, 10)}</span>}
        <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">{paper.source}</span>
        <span className={`font-mono font-medium ${scoreColor}`}>
          relevance: {paper.relevance.toFixed(2)}
        </span>
      </div>

      <div className="mt-4">
        <Tags raw={paper.tags} />
      </div>

      <div className="mt-6 border-t border-slate-800 pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Abstract</h2>
        <p className="text-slate-300 leading-relaxed text-sm">{paper.abstract}</p>
      </div>

      <div className="mt-6">
        <a
          href={paper.url || paper.id}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
        >
          View on {paper.source} →
        </a>
      </div>
    </div>
  );
}
