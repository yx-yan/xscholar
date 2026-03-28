"use client";
import { useState } from "react";
import Link from "next/link";
import type { Paper } from "@/lib/db";

function RelevanceBadge({ score }: { score: number }) {
  const color =
    score >= 0.6 ? "bg-emerald-900 text-emerald-300 border-emerald-700" :
    score >= 0.3 ? "bg-amber-900 text-amber-300 border-amber-700" :
    "bg-slate-800 text-slate-400 border-slate-600";
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-mono ${color}`}>
      {score.toFixed(2)}
    </span>
  );
}

function Tags({ raw }: { raw: string }) {
  let tags: string[] = [];
  try { tags = JSON.parse(raw); } catch { tags = []; }
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {tags.slice(0, 6).map((t) => (
        <span key={t} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
          {t}
        </span>
      ))}
    </div>
  );
}

export default function PaperCard({ paper }: { paper: Paper }) {
  const [expanded, setExpanded] = useState(false);
  const encodedId = encodeURIComponent(paper.id);
  const date = paper.published_at ? paper.published_at.slice(0, 10) : "";

  return (
    <div className="border border-slate-800 rounded-lg p-4 hover:border-slate-600 transition-colors bg-slate-900/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link href={`/paper/${encodedId}`} className="text-slate-100 font-medium hover:text-white leading-snug block">
            {paper.title}
          </Link>
          <div className="text-slate-500 text-xs mt-1 truncate">{paper.authors}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <RelevanceBadge score={paper.relevance} />
          <span className="text-xs text-slate-600 font-mono">{date}</span>
        </div>
      </div>

      <Tags raw={paper.tags} />

      <div className="mt-3">
        <p className={`text-sm text-slate-400 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
          {paper.abstract}
        </p>
        {paper.abstract?.length > 200 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-slate-500 hover:text-slate-300 mt-1 transition-colors"
          >
            {expanded ? "collapse ↑" : "expand ↓"}
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 mt-3">
        <a
          href={paper.url || paper.id}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          → view paper
        </a>
        <span className="text-xs text-slate-600">{paper.source}</span>
      </div>
    </div>
  );
}
