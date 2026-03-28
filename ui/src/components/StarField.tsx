"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Paper } from "@/lib/db";

// Topic → hue mapping
const TOPIC_COLORS: Record<string, string> = {
  diffusion:       "hsl(220,100%,75%)",  // blue
  transformer:     "hsl(270,100%,75%)",  // purple
  segmentation:    "hsl(160,100%,65%)",  // teal
  generation:      "hsl(190,100%,70%)",  // cyan
  video:           "hsl(30,100%,70%)",   // orange
  multimodal:      "hsl(320,100%,75%)",  // pink
  language:        "hsl(50,100%,70%)",   // yellow
  llm:             "hsl(50,100%,70%)",
  reinforcement:   "hsl(0,100%,70%)",    // red
  robotic:         "hsl(0,100%,70%)",
  detection:       "hsl(140,90%,65%)",   // green
  tracking:        "hsl(140,90%,65%)",
  "3d":            "hsl(200,90%,70%)",
  depth:           "hsl(200,90%,70%)",
  flow:            "hsl(180,80%,65%)",
  editing:         "hsl(300,90%,75%)",
  default:         "hsl(210,30%,70%)",   // dim white-blue
};

function getStarColor(tags: string): string {
  let parsed: string[] = [];
  try { parsed = JSON.parse(tags); } catch { parsed = []; }
  for (const t of parsed) {
    if (TOPIC_COLORS[t.toLowerCase()]) return TOPIC_COLORS[t.toLowerCase()];
  }
  return TOPIC_COLORS.default;
}

function getStarSize(relevance: number): number {
  if (relevance >= 0.6) return 6;
  if (relevance >= 0.3) return 4;
  if (relevance >= 0.1) return 2.5;
  return 1.5;
}

interface Star {
  paper: Paper;
  x: number;
  y: number;
  color: string;
  size: number;
  twinkleDur: number;
  twinkleDelay: number;
}

function buildStars(papers: Paper[], w: number, h: number): Star[] {
  // Seed positions deterministically from paper ID
  return papers.map((p) => {
    let hash = 0;
    const str = p.id + p.title;
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    const x = ((hash % 1000) / 1000) * w;
    const y = (((hash >> 10) % 1000) / 1000) * h;
    return {
      paper: p,
      x, y,
      color: getStarColor(p.tags || "[]"),
      size: getStarSize(p.relevance),
      twinkleDur: 2 + (hash % 40) / 10,
      twinkleDelay: (hash % 30) / 10,
    };
  });
}

// Dim background stars (non-paper noise)
function buildNoise(count: number, w: number, h: number) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.2,
      opacity: 0.1 + Math.random() * 0.25,
      dur: 2 + Math.random() * 4,
      delay: Math.random() * 5,
    });
  }
  return stars;
}

interface PaperPanelProps {
  star: Star;
  onClose: () => void;
}

function PaperPanel({ star, onClose }: PaperPanelProps) {
  const { paper } = star;
  let tags: string[] = [];
  try { tags = JSON.parse(paper.tags || "[]"); } catch {}

  const scoreColor =
    paper.relevance >= 0.6 ? "#6ee7b7" :
    paper.relevance >= 0.3 ? "#fcd34d" :
    "#94a3b8";

  return (
    <div className="panel-fade-in fixed inset-0 flex items-end sm:items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl p-5 relative"
        style={{ background: "rgba(10,10,20,0.95)", border: `1px solid ${star.color}44`, backdropFilter: "blur(20px)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl" style={{ background: `linear-gradient(90deg, transparent, ${star.color}88, transparent)` }} />

        <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-slate-200 text-xl leading-none transition-colors">×</button>

        <div className="flex items-start gap-3 mb-3">
          <div className="mt-1 shrink-0 rounded-full" style={{ width: star.size * 3, height: star.size * 3, background: star.color, boxShadow: `0 0 10px ${star.color}` }} />
          <h2 className="text-white font-semibold text-sm leading-snug pr-6">{paper.title}</h2>
        </div>

        <div className="flex flex-wrap gap-2 mb-3 text-xs text-slate-500">
          <span>{paper.authors?.split(',').slice(0,3).join(', ')}{paper.authors?.includes(',') ? ' et al.' : ''}</span>
          {paper.published_at && <span>·  {String(paper.published_at).slice(0,10)}</span>}
          <span>· {paper.source}</span>
          <span style={{ color: scoreColor }}>· score {paper.relevance.toFixed(2)}</span>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0,6).map(t => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${star.color}18`, color: star.color, border: `1px solid ${star.color}33` }}>{t}</span>
            ))}
          </div>
        )}

        <p className="text-slate-400 text-xs leading-relaxed line-clamp-4 mb-4">{paper.abstract}</p>

        <a
          href={paper.url || paper.id}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: `${star.color}22`, color: star.color, border: `1px solid ${star.color}44` }}
        >
          View paper →
        </a>
      </div>
    </div>
  );
}

export default function StarField({ papers }: { papers: Paper[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [stars, setStars] = useState<Star[]>([]);
  const [noise, setNoise] = useState<ReturnType<typeof buildNoise>>([]);
  const [selected, setSelected] = useState<Star | null>(null);
  const [hovered, setHovered] = useState<Star | null>(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });
  const frameRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth, h = window.innerHeight;
      setDims({ w, h });
      setStars(buildStars(papers, w, h));
      setNoise(buildNoise(300, w, h));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [papers]);

  // Canvas draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dims.w === 0) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = dims.w;
    canvas.height = dims.h;

    const draw = (t: number) => {
      timeRef.current = t;
      ctx.clearRect(0, 0, dims.w, dims.h);

      // Background gradient
      const bg = ctx.createRadialGradient(dims.w * 0.5, dims.h * 0.5, 0, dims.w * 0.5, dims.h * 0.5, dims.w * 0.7);
      bg.addColorStop(0, "#0e0e1f");
      bg.addColorStop(1, "#07070f");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, dims.w, dims.h);

      // Noise stars
      for (const n of noise) {
        const flicker = n.opacity * (0.7 + 0.3 * Math.sin(t / 1000 / n.dur * Math.PI * 2 + n.delay));
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,210,255,${flicker})`;
        ctx.fill();
      }

      // Paper stars
      for (const s of stars) {
        const flicker = 0.75 + 0.25 * Math.sin(t / 1000 / s.twinkleDur * Math.PI * 2 + s.twinkleDelay);
        const isHov = hovered?.paper.id === s.paper.id;
        const isSel = selected?.paper.id === s.paper.id;
        const r = s.size * (isHov || isSel ? 1.6 : 1);

        // Glow
        if (s.paper.relevance >= 0.2 || isHov) {
          const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 6);
          glow.addColorStop(0, s.color.replace("hsl", "hsla").replace(")", `,${0.35 * flicker})`));
          glow.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.arc(s.x, s.y, r * 6, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();
        }

        // Core
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fillStyle = s.color.replace("hsl(", `hsla(`).replace(")", `,${flicker})`);
        ctx.fill();

        // Cross sparkle for bright stars
        if (s.paper.relevance >= 0.4 || isHov) {
          ctx.strokeStyle = s.color.replace("hsl(", "hsla(").replace(")", `,${0.5 * flicker})`);
          ctx.lineWidth = 0.5;
          const arm = r * 4;
          ctx.beginPath(); ctx.moveTo(s.x - arm, s.y); ctx.lineTo(s.x + arm, s.y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(s.x, s.y - arm); ctx.lineTo(s.x, s.y + arm); ctx.stroke();
        }

        // Pulse ring if selected
        if (isSel) {
          const pulse = ((t % 1200) / 1200);
          ctx.beginPath();
          ctx.arc(s.x, s.y, r * (1 + pulse * 3), 0, Math.PI * 2);
          ctx.strokeStyle = s.color.replace("hsl(", "hsla(").replace(")", `,${(1 - pulse) * 0.6})`);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [dims, stars, noise, hovered, selected]);

  const hitTest = useCallback((mx: number, my: number): Star | null => {
    let closest: Star | null = null;
    let minDist = 20;
    for (const s of stars) {
      const d = Math.hypot(mx - s.x, my - s.y);
      if (d < minDist) { minDist = d; closest = s; }
    }
    return closest;
  }, [stars]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const s = hitTest(e.clientX, e.clientY);
    setHovered(s);
    setTooltip({ x: e.clientX, y: e.clientY });
    if (canvasRef.current) canvasRef.current.style.cursor = s ? "pointer" : "crosshair";
  }, [hitTest]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const s = hitTest(e.clientX, e.clientY);
    if (s) setSelected(s);
  }, [hitTest]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    const s = hitTest(t.clientX, t.clientY);
    if (s) setSelected(s);
  }, [hitTest]);

  const topPapers = [...papers].sort((a, b) => b.relevance - a.relevance).slice(0, 5);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ cursor: "crosshair" }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onTouchEnd={handleTouchEnd}
      />

      {/* Header */}
      <div className="absolute top-4 left-5 z-10 pointer-events-none">
        <div className="text-white text-lg font-bold tracking-wide">⚡ Xscholar</div>
        <div className="text-slate-500 text-xs mt-0.5">{papers.length} papers · click a star to explore</div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 pointer-events-none">
        {Object.entries(TOPIC_COLORS).filter(([k]) => k !== "default").slice(0, 8).map(([topic, color]) => (
          <div key={topic} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
            <span className="text-xs" style={{ color }}>{topic}</span>
          </div>
        ))}
      </div>

      {/* Bright stars list */}
      <div className="absolute bottom-4 left-5 z-10 max-w-xs">
        <div className="text-slate-600 text-xs mb-2 uppercase tracking-widest">brightest</div>
        {topPapers.map(p => {
          const s = stars.find(s => s.paper.id === p.id);
          return (
            <button
              key={p.id}
              onClick={() => s && setSelected(s)}
              className="block text-left w-full text-xs mb-1 truncate hover:opacity-100 transition-opacity"
              style={{ color: s?.color ?? "#94a3b8", opacity: 0.7 }}
            >
              ★ {p.title?.slice(0, 48)}…
            </button>
          );
        })}
      </div>

      {/* Hover tooltip */}
      {hovered && !selected && (
        <div
          className="pointer-events-none fixed z-20 text-xs px-2 py-1 rounded-lg max-w-xs"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 10,
            background: "rgba(10,10,25,0.9)",
            border: `1px solid ${hovered.color}44`,
            color: hovered.color,
            transform: tooltip.x > dims.w - 250 ? "translateX(-110%)" : undefined,
          }}
        >
          {hovered.paper.title?.slice(0, 60)}…
        </div>
      )}

      {/* Paper panel */}
      {selected && <PaperPanel star={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
