"use client";
import { useEffect, useRef, useState } from "react";
import { useEditor } from "@/store/editor";

type Drag = { id: string; mode: "move" | "l" | "r"; grabMs: number; s: number; e: number } | null;

export default function Timeline() {
  const clips = useEditor((s) => s.clips);
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);
  const updateClip = useEditor((s) => s.updateClip);
  const barRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag>(null);
  const [dur, setDur] = useState(0);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const el = useEditor.getState().audioEl;
      if (el && el.duration && isFinite(el.duration)) {
        setDur(el.duration);
        setPct((el.currentTime / el.duration) * 100 || 0);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const durMs = dur * 1000;
  const msAt = (clientX: number) => {
    const r = barRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(durMs, ((clientX - r.left) / r.width) * durMs));
  };

  const onBarDown = (e: React.PointerEvent) => {
    if (drag.current || !durMs) return;
    const el = useEditor.getState().audioEl;
    if (el) el.currentTime = msAt(e.clientX) / 1000;
  };

  const startDrag = (e: React.PointerEvent, id: string, mode: "move" | "l" | "r") => {
    e.stopPropagation();
    const c = useEditor.getState().clips.find((x) => x.id === id);
    if (!c) return;
    select(id);
    drag.current = { id, mode, grabMs: msAt(e.clientX), s: c.startMs, e: c.endMs };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !durMs) return;
    const m = msAt(e.clientX);
    if (d.mode === "move") {
      const len = d.e - d.s;
      let s = d.s + (m - d.grabMs);
      s = Math.max(0, Math.min(durMs - len, s));
      updateClip(d.id, { startMs: s, endMs: s + len });
    } else if (d.mode === "l") {
      updateClip(d.id, { startMs: Math.max(0, Math.min(d.e - 100, m)) });
    } else {
      updateClip(d.id, { endMs: Math.min(durMs, Math.max(d.s + 100, m)) });
    }
  };
  const onUp = () => {
    drag.current = null;
  };

  return (
    <div className="w-full max-w-[900px]">
      <div
        ref={barRef}
        onPointerDown={onBarDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        className="relative h-14 bg-white border border-[var(--line)] select-none touch-none"
      >
        {/* playhead */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-black pointer-events-none z-10"
          style={{ left: `${pct}%` }}
        />
        {/* clip blocks */}
        {durMs > 0 &&
          clips.map((c, i) => {
            const left = (c.startMs / durMs) * 100;
            const width = ((c.endMs - c.startMs) / durMs) * 100;
            const sel = c.id === selectedId;
            return (
              <div
                key={c.id}
                onPointerDown={(e) => startDrag(e, c.id, "move")}
                className={`absolute h-6 ${sel ? "bg-black text-white" : "bg-[#ddd] text-black"} text-[10px] flex items-center overflow-hidden cursor-grab`}
                style={{ left: `${left}%`, width: `${width}%`, top: `${4 + (i % 3) * 14}px` }}
                title={c.name}
              >
                <span
                  onPointerDown={(e) => startDrag(e, c.id, "l")}
                  className="absolute left-0 top-0 bottom-0 w-1.5 bg-black/40 cursor-ew-resize"
                />
                <span className="px-2 truncate pointer-events-none lowercase">{c.name}</span>
                <span
                  onPointerDown={(e) => startDrag(e, c.id, "r")}
                  className="absolute right-0 top-0 bottom-0 w-1.5 bg-black/40 cursor-ew-resize"
                />
              </div>
            );
          })}
      </div>
      <div className="text-[10px] text-[var(--muted)] mt-1 font-mono">
        {dur ? `${dur.toFixed(1)}s` : "—"} · click to seek · drag clips to time them
      </div>
    </div>
  );
}
