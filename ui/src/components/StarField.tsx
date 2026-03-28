"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Paper } from "@/lib/db";

const TOPIC_COLORS: Record<string, string> = {
  diffusion:      "hsl(220,100%,75%)",
  transformer:    "hsl(270,100%,75%)",
  segmentation:   "hsl(160,100%,65%)",
  generation:     "hsl(190,100%,70%)",
  video:          "hsl(30,100%,70%)",
  multimodal:     "hsl(320,100%,75%)",
  language:       "hsl(50,100%,70%)",
  llm:            "hsl(50,100%,70%)",
  reinforcement:  "hsl(0,100%,70%)",
  robotic:        "hsl(0,100%,70%)",
  detection:      "hsl(140,90%,65%)",
  tracking:       "hsl(140,90%,65%)",
  "3d":           "hsl(200,90%,70%)",
  depth:          "hsl(200,90%,70%)",
  flow:           "hsl(180,80%,65%)",
  editing:        "hsl(300,90%,75%)",
  default:        "hsl(210,30%,70%)",
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
  // position relative to center (so rotation works around center)
  rx: number; ry: number;
  color: string;
  size: number;
  twinkleDur: number;
  twinkleDelay: number;
}

function buildStars(papers: Paper[], w: number, h: number): Star[] {
  return papers.map((p) => {
    let hash = 0;
    const str = p.id + p.title;
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    // position relative to center
    const rx = (((hash % 1000) / 1000) - 0.5) * w * 1.4;
    const ry = ((((hash >> 10) % 1000) / 1000) - 0.5) * h * 1.4;
    return {
      paper: p, rx, ry,
      color: getStarColor(p.tags || "[]"),
      size: getStarSize(p.relevance),
      twinkleDur: 2 + (hash % 40) / 10,
      twinkleDelay: (hash % 30) / 10,
    };
  });
}

function buildNoise(count: number, w: number, h: number) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      rx: (Math.random() - 0.5) * w * 1.6,
      ry: (Math.random() - 0.5) * h * 1.6,
      r: Math.random() * 1.2,
      opacity: 0.1 + Math.random() * 0.25,
      dur: 2 + Math.random() * 4,
      delay: Math.random() * 5,
    });
  }
  return stars;
}

interface PaperPanelProps { star: Star; onClose: () => void; }

function PaperPanel({ star, onClose }: PaperPanelProps) {
  const { paper } = star;
  let tags: string[] = [];
  try { tags = JSON.parse(paper.tags || "[]"); } catch {}
  const scoreColor = paper.relevance >= 0.6 ? "#6ee7b7" : paper.relevance >= 0.3 ? "#fcd34d" : "#94a3b8";
  return (
    <div className="panel-fade-in fixed inset-0 flex items-end sm:items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl p-5 relative"
        style={{ background: "rgba(10,10,20,0.95)", border: `1px solid ${star.color}44`, backdropFilter: "blur(20px)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl" style={{ background: `linear-gradient(90deg,transparent,${star.color}88,transparent)` }} />
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-slate-200 text-xl leading-none transition-colors">×</button>
        <div className="flex items-start gap-3 mb-3">
          <div className="mt-1 shrink-0 rounded-full" style={{ width: star.size * 3, height: star.size * 3, background: star.color, boxShadow: `0 0 10px ${star.color}` }} />
          <h2 className="text-white font-semibold text-sm leading-snug pr-6">{paper.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2 mb-3 text-xs text-slate-500">
          <span>{paper.authors?.split(",").slice(0,3).join(", ")}{paper.authors?.includes(",") ? " et al." : ""}</span>
          {paper.published_at && <span>· {String(paper.published_at).slice(0,10)}</span>}
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
        <a href={paper.url || paper.id} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: `${star.color}22`, color: star.color, border: `1px solid ${star.color}44` }}>
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

  // Camera state — all mutable refs for perf
  const angleRef = useRef(0);
  const zoomRef = useRef(1);
  const spinningRef = useRef(true);
  const frameRef = useRef<number>(0);
  const starsRef = useRef<Star[]>([]);
  const noiseRef = useRef<ReturnType<typeof buildNoise>>([]);
  const hoveredRef = useRef<Star | null>(null);
  const selectedRef = useRef<Star | null>(null);
  const dimsRef = useRef({ w: 0, h: 0 });

  useEffect(() => { starsRef.current = stars; }, [stars]);
  useEffect(() => { noiseRef.current = noise; }, [noise]);
  useEffect(() => { hoveredRef.current = hovered; }, [hovered]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { dimsRef.current = dims; }, [dims]);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth, h = window.innerHeight;
      setDims({ w, h });
      setStars(buildStars(papers, w, h));
      setNoise(buildNoise(350, w, h));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [papers]);

  // Wheel zoom
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current = Math.max(0.3, Math.min(5, zoomRef.current * (e.deltaY < 0 ? 1.1 : 0.9)));
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  // Pinch zoom (touch)
  useEffect(() => {
    let lastDist = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lastDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        zoomRef.current = Math.max(0.3, Math.min(5, zoomRef.current * (d / lastDist)));
        lastDist = d;
      }
    };
    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => { window.removeEventListener("touchstart", onTouchStart); window.removeEventListener("touchmove", onTouchMove); };
  }, []);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dims.w === 0) return;
    canvas.width = dims.w;
    canvas.height = dims.h;
    const ctx = canvas.getContext("2d")!;
    let last = 0;

    const draw = (t: number) => {
      const dt = t - last; last = t;
      const { w, h } = dimsRef.current;
      const stars = starsRef.current;
      const noise = noiseRef.current;
      const hov = hoveredRef.current;
      const sel = selectedRef.current;

      // Slow auto-spin
      if (spinningRef.current) angleRef.current += dt * 0.000015;
      const angle = angleRef.current;
      const zoom = zoomRef.current;
      const cx = w / 2, cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Sky gradient
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
      bg.addColorStop(0, "#0e0e1f"); bg.addColorStop(1, "#07070f");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // Milky way haze
      const mw = ctx.createLinearGradient(0, cy * 0.3, w, cy * 1.7);
      mw.addColorStop(0, "transparent");
      mw.addColorStop(0.4, "rgba(120,120,200,0.03)");
      mw.addColorStop(0.6, "rgba(120,120,200,0.05)");
      mw.addColorStop(1, "transparent");
      ctx.fillStyle = mw; ctx.fillRect(0, 0, w, h);

      // Transform: rotate + zoom around center
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.scale(zoom, zoom);

      // Noise stars
      for (const n of noise) {
        const flicker = n.opacity * (0.7 + 0.3 * Math.sin(t / 1000 / n.dur * Math.PI * 2 + n.delay));
        ctx.beginPath();
        ctx.arc(n.rx, n.ry, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,210,255,${flicker})`;
        ctx.fill();
      }

      // Paper stars
      for (const s of stars) {
        const flicker = 0.75 + 0.25 * Math.sin(t / 1000 / s.twinkleDur * Math.PI * 2 + s.twinkleDelay);
        const isHov = hov?.paper.id === s.paper.id;
        const isSel = sel?.paper.id === s.paper.id;
        const r = s.size * (isHov || isSel ? 1.7 : 1);

        // Glow
        if (s.paper.relevance >= 0.1 || isHov) {
          const glowR = r * (isHov ? 10 : 6);
          const glow = ctx.createRadialGradient(s.rx, s.ry, 0, s.rx, s.ry, glowR);
          glow.addColorStop(0, s.color.replace("hsl(","hsla(").replace(")",`,${0.4*flicker})`));
          glow.addColorStop(1, "transparent");
          ctx.beginPath(); ctx.arc(s.rx, s.ry, glowR, 0, Math.PI*2);
          ctx.fillStyle = glow; ctx.fill();
        }

        // Core
        ctx.beginPath(); ctx.arc(s.rx, s.ry, r, 0, Math.PI*2);
        ctx.fillStyle = s.color.replace("hsl(","hsla(").replace(")",`,${flicker})`);
        ctx.fill();

        // Sparkle cross
        if (s.paper.relevance >= 0.3 || isHov) {
          ctx.strokeStyle = s.color.replace("hsl(","hsla(").replace(")",`,${0.5*flicker})`);
          ctx.lineWidth = 0.5 / zoom;
          const arm = r * (isHov ? 6 : 4);
          ctx.beginPath(); ctx.moveTo(s.rx-arm, s.ry); ctx.lineTo(s.rx+arm, s.ry); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(s.rx, s.ry-arm); ctx.lineTo(s.rx, s.ry+arm); ctx.stroke();
        }

        // Pulse ring on select
        if (isSel) {
          const pulse = (t % 1400) / 1400;
          ctx.beginPath(); ctx.arc(s.rx, s.ry, r*(1+pulse*4), 0, Math.PI*2);
          ctx.strokeStyle = s.color.replace("hsl(","hsla(").replace(")",`,${(1-pulse)*0.7})`);
          ctx.lineWidth = 1 / zoom; ctx.stroke();
        }
      }

      ctx.restore();
      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [dims]);

  // Hit test: convert screen coords → rotated+zoomed space
  const hitTest = useCallback((mx: number, my: number): Star | null => {
    const { w, h } = dimsRef.current;
    const cx = w/2, cy = h/2;
    const angle = angleRef.current;
    const zoom = zoomRef.current;
    // Invert transform
    const dx = (mx - cx) / zoom, dy = (my - cy) / zoom;
    const cos = Math.cos(-angle), sin = Math.sin(-angle);
    const lx = dx*cos - dy*sin, ly = dx*sin + dy*cos;

    let closest: Star | null = null;
    let minDist = 24 / zoom;
    for (const s of starsRef.current) {
      const d = Math.hypot(lx - s.rx, ly - s.ry);
      if (d < minDist) { minDist = d; closest = s; }
    }
    return closest;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const s = hitTest(e.clientX, e.clientY);
    setHovered(s);
    setTooltip({ x: e.clientX, y: e.clientY });
    if (canvasRef.current) canvasRef.current.style.cursor = s ? "pointer" : "crosshair";
  }, [hitTest]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const s = hitTest(e.clientX, e.clientY);
    if (s) { setSelected(s); spinningRef.current = false; }
    else { spinningRef.current = true; }
  }, [hitTest]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.changedTouches.length === 1) {
      const t = e.changedTouches[0];
      const s = hitTest(t.clientX, t.clientY);
      if (s) { setSelected(s); spinningRef.current = false; }
    }
  }, [hitTest]);

  const topPapers = [...papers].sort((a,b)=>b.relevance-a.relevance).slice(0,5);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ cursor:"crosshair" }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onTouchEnd={handleTouchEnd}
      />

      {/* Header — hidden when sidebar open */}
      <div className="absolute top-4 left-5 z-10 pointer-events-none">
        <div className="text-slate-500 text-xs mt-0.5">{papers.length} papers · scroll to zoom · click a star</div>
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-36 z-10 flex gap-2">
        <button
          onClick={() => { zoomRef.current = Math.min(5, zoomRef.current * 1.3); }}
          className="w-8 h-8 rounded-full text-slate-300 hover:text-white text-lg flex items-center justify-center transition-colors"
          style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)" }}
        >+</button>
        <button
          onClick={() => { zoomRef.current = Math.max(0.3, zoomRef.current * 0.77); }}
          className="w-8 h-8 rounded-full text-slate-300 hover:text-white text-lg flex items-center justify-center transition-colors"
          style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)" }}
        >−</button>
        <button
          onClick={() => { spinningRef.current = !spinningRef.current; }}
          className="w-8 h-8 rounded-full text-slate-300 hover:text-white text-xs flex items-center justify-center transition-colors"
          style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)" }}
          title="Toggle spin"
        >⟳</button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 pointer-events-none">
        {Object.entries(TOPIC_COLORS).filter(([k])=>k!=="default").slice(0,8).map(([topic,color])=>(
          <div key={topic} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background:color, boxShadow:`0 0 4px ${color}` }} />
            <span className="text-xs" style={{ color }}>{topic}</span>
          </div>
        ))}
      </div>

      {/* Brightest */}
      <div className="absolute bottom-4 left-5 z-10 max-w-xs">
        <div className="text-slate-600 text-xs mb-2 uppercase tracking-widest">brightest</div>
        {topPapers.map(p => {
          const s = starsRef.current.find(s=>s.paper.id===p.id);
          return (
            <button key={p.id}
              onClick={() => { if(s){ setSelected(s); spinningRef.current=false; } }}
              className="block text-left w-full text-xs mb-1 truncate hover:opacity-100 transition-opacity"
              style={{ color:s?.color??"#94a3b8", opacity:0.7 }}
            >★ {p.title?.slice(0,48)}…</button>
          );
        })}
      </div>

      {/* Zoom hint */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
        <div className="text-slate-700 text-xs">scroll to zoom · drag to explore</div>
      </div>

      {/* Hover tooltip */}
      {hovered && !selected && (
        <div className="pointer-events-none fixed z-20 text-xs px-2 py-1 rounded-lg max-w-xs"
          style={{ left:tooltip.x+12, top:tooltip.y-10, background:"rgba(10,10,25,0.9)",
            border:`1px solid ${hovered.color}44`, color:hovered.color,
            transform:tooltip.x>dimsRef.current.w-250?"translateX(-110%)":undefined }}>
          {hovered.paper.title?.slice(0,60)}…
        </div>
      )}

      {selected && <PaperPanel star={selected} onClose={() => { setSelected(null); spinningRef.current=true; }} />}
    </div>
  );
}
