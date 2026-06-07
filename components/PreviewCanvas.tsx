"use client";
import { useEffect, useRef } from "react";
import { useEditor } from "@/store/editor";
import { DIMS } from "@/lib/dims";
import { renderAt } from "@/lib/render";

// Live preview: a rAF loop renders the current store state at the audio's current time.
// State is read imperatively (useEditor.getState) so we don't re-subscribe every frame.
export default function PreviewCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

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
      // fit the display size to the container
      const parent = cv.parentElement;
      const maxW = parent ? parent.clientWidth : 600;
      const maxH = window.innerHeight * 0.78;
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
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex items-center justify-center w-full">
      <canvas ref={ref} className="shadow-[0_1px_0_var(--line)] bg-white touch-none" />
    </div>
  );
}
