"use client";
import { useState, useEffect, useRef } from "react";
import type { Paper } from "@/lib/db";

interface Stats {
  total: number;
  recentCount: number;
  sources: { source: string; count: number }[];
  topTags: [string, number][];
}

interface SidebarProps {
  onFilter: (papers: Paper[]) => void;
  allPapers: Paper[];
}

const TOPIC_COLORS: Record<string, string> = {
  diffusion:"hsl(220,100%,75%)", transformer:"hsl(270,100%,75%)",
  segmentation:"hsl(160,100%,65%)", generation:"hsl(190,100%,70%)",
  video:"hsl(30,100%,70%)", multimodal:"hsl(320,100%,75%)",
  language:"hsl(50,100%,70%)", llm:"hsl(50,100%,70%)",
  reinforcement:"hsl(0,100%,70%)", detection:"hsl(140,90%,65%)",
  "3d":"hsl(200,90%,70%)", editing:"hsl(300,90%,75%)",
};

export default function Sidebar({ onFilter, allPapers }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"search"|"filter"|"db">("search");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const [minRel, setMinRel] = useState(0);
  const [since, setSince] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [results, setResults] = useState<Paper[]>(allPapers);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Load stats when DB tab opens
  useEffect(() => {
    if (tab === "db" && !stats) {
      setStatsLoading(true);
      fetch("/api/stats").then(r=>r.json()).then(d=>{ setStats(d); setStatsLoading(false); });
    }
  }, [tab, stats]);

  // Search / filter
  const doSearch = (q: string, src: string, rel: number, sinceVal: string) => {
    setSearching(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (src) params.set("source", src);
    if (rel > 0) params.set("minRelevance", String(rel));
    if (sinceVal) params.set("since", sinceVal);
    params.set("limit", "200");

    fetch(`/api/search?${params}`).then(r=>r.json()).then(d=>{
      const papers = d.papers ?? allPapers;
      setResults(papers);
      onFilter(papers);
      setSearching(false);
    }).catch(()=>setSearching(false));
  };

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query, source, minRel, since), 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, source, minRel, since]);

  const clearFilters = () => { setQuery(""); setSource(""); setMinRel(0); setSince(""); };

  const hasFilters = query || source || minRel > 0 || since;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-30 mt-10 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
        style={{ background: open ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)",
          border:"1px solid rgba(255,255,255,0.15)", color: open ? "#fff" : "#94a3b8",
          marginTop: "56px" }}
      >
        {open ? "✕ close" : "⌖ explore"}
      </button>

      {/* Sidebar panel */}
      <div
        className="absolute left-0 top-0 h-full z-20 flex flex-col transition-all duration-300"
        style={{ width: open ? "320px" : "0", overflow: "hidden",
          background: "rgba(8,8,18,0.92)", backdropFilter:"blur(20px)",
          borderRight: open ? "1px solid rgba(255,255,255,0.07)" : "none" }}
      >
        <div className="flex flex-col h-full min-w-[320px]">
          {/* Logo */}
          <div className="p-5 pb-3 border-b border-white/5">
            <div className="text-white font-bold text-base tracking-wide">⚡ Xscholar</div>
            <div className="text-slate-500 text-xs mt-0.5">research intelligence</div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/5">
            {(["search","filter","db"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2.5 text-xs font-medium transition-colors"
                style={{ color: tab===t ? "#fff" : "#64748b",
                  borderBottom: tab===t ? "2px solid #6366f1" : "2px solid transparent" }}>
                {t === "search" ? "🔍 Search" : t === "filter" ? "⚡ Filter" : "🗄️ Database"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">

            {/* SEARCH TAB */}
            {tab === "search" && (
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text" value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search papers, authors, topics..."
                    className="w-full px-3 py-2.5 text-sm rounded-lg outline-none transition-all"
                    style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
                      color:"#e2e8f0", caretColor:"#6366f1" }}
                    autoFocus
                  />
                  {searching && <div className="absolute right-3 top-3 w-3 h-3 rounded-full border border-indigo-400 border-t-transparent animate-spin" />}
                </div>

                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>{results.length} paper{results.length !== 1 ? "s" : ""}</span>
                  {hasFilters && <button onClick={clearFilters} className="text-indigo-400 hover:text-indigo-300 transition-colors">clear all</button>}
                </div>

                {/* Quick keyword buttons */}
                <div>
                  <div className="text-xs text-slate-600 mb-2 uppercase tracking-widest">quick search</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(TOPIC_COLORS).filter(k=>k!=="default").map(kw => (
                      <button key={kw} onClick={() => setQuery(kw)}
                        className="text-xs px-2 py-1 rounded-full transition-all"
                        style={{ background: query===kw ? `${TOPIC_COLORS[kw]}22` : "rgba(255,255,255,0.05)",
                          border: `1px solid ${query===kw ? TOPIC_COLORS[kw]+"55" : "rgba(255,255,255,0.08)"}`,
                          color: query===kw ? TOPIC_COLORS[kw] : "#64748b" }}>
                        {kw}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Results preview */}
                {query && results.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <div className="text-xs text-slate-600 uppercase tracking-widest">results</div>
                    {results.slice(0,8).map(p => {
                      let tags: string[] = []; try { tags = JSON.parse(p.tags||"[]"); } catch {}
                      const color = TOPIC_COLORS[tags[0]] ?? "#64748b";
                      return (
                        <div key={p.id} className="p-2.5 rounded-lg text-xs" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)" }}>
                          <div className="text-slate-200 leading-snug mb-1 line-clamp-2">{p.title}</div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono" style={{ color }}>{p.relevance.toFixed(2)}</span>
                            <span className="text-slate-600">{String(p.published_at||"").slice(0,10)}</span>
                            <span className="text-slate-600">{p.source}</span>
                          </div>
                        </div>
                      );
                    })}
                    {results.length > 8 && <div className="text-xs text-slate-600 text-center">+{results.length-8} more shown in sky</div>}
                  </div>
                )}
              </div>
            )}

            {/* FILTER TAB */}
            {tab === "filter" && (
              <div className="space-y-5">
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-widest block mb-2">Source</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["", "arxiv", "semantic_scholar"].map(s => (
                      <button key={s} onClick={() => setSource(s)}
                        className="text-xs px-3 py-1.5 rounded-full transition-all"
                        style={{ background: source===s ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
                          border:`1px solid ${source===s ? "#6366f155" : "rgba(255,255,255,0.08)"}`,
                          color: source===s ? "#a5b4fc" : "#64748b" }}>
                        {s || "all"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-widest block mb-2">
                    Min relevance: <span className="text-white">{minRel.toFixed(1)}</span>
                  </label>
                  <input type="range" min={0} max={1} step={0.1} value={minRel}
                    onChange={e => setMinRel(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500" />
                  <div className="flex justify-between text-xs text-slate-600 mt-1"><span>0.0</span><span>1.0</span></div>
                </div>

                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-widest block mb-2">Published after</label>
                  <input type="date" value={since} onChange={e => setSince(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                    style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"#e2e8f0" }} />
                </div>

                <div className="pt-2 border-t border-white/5">
                  <div className="text-xs text-slate-500 mb-2">{results.length} papers match</div>
                  {hasFilters && (
                    <button onClick={clearFilters}
                      className="w-full py-2 text-xs rounded-lg transition-colors"
                      style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", color:"#94a3b8" }}>
                      Reset all filters
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* DB TAB */}
            {tab === "db" && (
              <div className="space-y-5">
                {statsLoading && (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-5 h-5 rounded-full border border-indigo-400 border-t-transparent animate-spin" />
                  </div>
                )}
                {stats && !statsLoading && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label:"Total Papers", value: stats.total, color:"#a5b4fc" },
                        { label:"Last 24h", value: stats.recentCount, color:"#6ee7b7" },
                      ].map(m => (
                        <div key={m.label} className="p-3 rounded-xl" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)" }}>
                          <div className="text-2xl font-bold" style={{ color:m.color }}>{m.value}</div>
                          <div className="text-xs text-slate-500 mt-1">{m.label}</div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className="text-xs text-slate-600 uppercase tracking-widest mb-2">by source</div>
                      {stats.sources.map(s => (
                        <div key={s.source} className="flex items-center gap-2 mb-2">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-400">{s.source}</span>
                              <span className="text-slate-500">{s.count}</span>
                            </div>
                            <div className="h-1 rounded-full bg-white/5">
                              <div className="h-1 rounded-full bg-indigo-500/60"
                                style={{ width:`${Math.round(s.count/stats.total*100)}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className="text-xs text-slate-600 uppercase tracking-widest mb-2">top topics</div>
                      <div className="flex flex-wrap gap-1.5">
                        {stats.topTags.map(([tag, count]) => (
                          <button key={tag} onClick={() => { setQuery(tag); setTab("search"); }}
                            className="text-xs px-2 py-1 rounded-full transition-all hover:opacity-100"
                            style={{ background:`${TOPIC_COLORS[tag] ?? "#64748b"}18`,
                              border:`1px solid ${TOPIC_COLORS[tag] ?? "#64748b"}33`,
                              color: TOPIC_COLORS[tag] ?? "#64748b", opacity:0.8 }}>
                            {tag} <span className="opacity-60">({count})</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button onClick={() => { setStats(null); setStatsLoading(true); fetch("/api/stats").then(r=>r.json()).then(d=>{setStats(d);setStatsLoading(false);}); }}
                      className="w-full py-2 text-xs rounded-lg transition-colors"
                      style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", color:"#94a3b8" }}>
                      ↻ Refresh stats
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/5 text-xs text-slate-600">
            <a href="https://github.com/yx-yan/xscholar" target="_blank" rel="noopener noreferrer"
              className="hover:text-slate-400 transition-colors">github.com/yx-yan/xscholar</a>
          </div>
        </div>
      </div>
    </>
  );
}
