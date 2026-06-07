"use client";
import { useEffect, useRef } from "react";
import { useEditor } from "@/store/editor";
import { DIMS } from "@/lib/dims";
import { renderAt } from "@/lib/render";
import type { Clip } from "@/lib/media";

type DragState =
  | { mode: "move"; id: string; px: number; py: number; nx: number; ny: number }
  | { mode: "resize"; id: string; px: number; nw: number }
  | null;

export default function PreviewCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const drag = useRef<DragState>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const loop = () => {
      const st = useEditor.getState();
      const dim = DIMS[st.aspect];
      if (cv.width !== dim.w || cv.height !== dim.h) {
        cv.width = dim.w;
        cv.height = dim.h;
      }
      const parent = cv.parentElement;
      const maxW = parent ? parent.clientWidth : 600;
      const maxH = window.innerHeight * 0.72;
      const s = Math.min(maxW / dim.w, maxH / dim.h);
      cv.style.width = `${dim.w * s}px`;
      cv.style.height = `${dim.h * s}px`;
      const el = st.audioEl;
      const tMs = (el ? el.currentTime : 0) * 1000;
      renderAt(
        ctx,
        dim,
        {
          words: st.words,
          pages: st.pages,
          wordPage: st.wordPage,
          clips: st.clips,
          textAnchor: st.textAnchor,
          fontScale: st.fontScale,
          selectedId: st.selectedId,
          showSelection: true,
        },
        tMs,
      );
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // ---- pointer drag/resize of clips (map CSS px -> canvas px) ----
    const toCanvas = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * cv.width) / r.width, y: ((e.clientY - r.top) * cv.height) / r.height };
    };
    const rectOf = (c: Clip, w: number, h: number) => {
      const cw = c.nw * w;
      const ch = cw * (c.ih / c.iw || 1);
      return { x: c.nx * w, y: c.ny * h, w: cw, h: ch };
    };
    const onDown = (e: PointerEvent) => {
      const st = useEditor.getState();
      if (!st.clips.length) return;
      const dim = DIMS[st.aspect];
      const p = toCanvas(e);
      const sel = st.clips.find((c) => c.id === st.selectedId);
      const hs = Math.max(18, dim.w * 0.02);
      if (sel) {
        const R = rectOf(sel, dim.w, dim.h);
        if (Math.abs(p.x - (R.x + R.w)) < hs && Math.abs(p.y - (R.y + R.h)) < hs) {
          drag.current = { mode: "resize", id: sel.id, px: p.x, nw: sel.nw };
          cv.setPointerCapture(e.pointerId);
          return;
        }
      }
      for (let i = st.clips.length - 1; i >= 0; i--) {
        const c = st.clips[i];
        const R = rectOf(c, dim.w, dim.h);
        if (p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h) {
          st.select(c.id);
          drag.current = { mode: "move", id: c.id, px: p.x, py: p.y, nx: c.nx, ny: c.ny };
          cv.setPointerCapture(e.pointerId);
          return;
        }
      }
      st.select(null);
    };
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const st = useEditor.getState();
      const dim = DIMS[st.aspect];
      const p = toCanvas(e);
      if (d.mode === "move") {
        st.updateClip(d.id, {
          nx: d.nx + (p.x - d.px) / dim.w,
          ny: d.ny + (p.y - d.py) / dim.h,
        });
      } else {
        const nw = Math.min(2, Math.max(0.05, d.nw + (p.x - d.px) / dim.w));
        st.updateClip(d.id, { nw });
      }
    };
    const onUp = (e: PointerEvent) => {
      drag.current = null;
      try {
        cv.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    };
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);

    return () => {
      cancelAnimationFrame(raf);
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div className="flex items-center justify-center w-full">
      <canvas ref={ref} className="shadow-[0_1px_0_var(--line)] bg-white touch-none cursor-crosshair" />
    </div>
  );
}
