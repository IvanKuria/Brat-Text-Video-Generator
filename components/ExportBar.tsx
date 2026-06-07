"use client";
import { useState } from "react";
import { useEditor } from "@/store/editor";
import { DIMS } from "@/lib/dims";
import { renderAt } from "@/lib/render";
import { exportOffline, supportsWebCodecs } from "@/lib/export";

export default function ExportBar() {
  const words = useEditor((s) => s.words);
  const setExporting = useEditor((s) => s.setExporting);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [dl, setDl] = useState<{ url: string; name: string; size: number } | null>(null);

  async function run() {
    const st = useEditor.getState();
    if (!st.words.length || !st.file) return;
    if (!supportsWebCodecs()) {
      setStatus("export needs chrome or edge (webcodecs).");
      return;
    }
    setBusy(true);
    setExporting(true);
    setDl(null);
    setStatus("rendering…");
    try {
      const dim = DIMS[st.aspect];
      const cv = document.createElement("canvas");
      cv.width = dim.w;
      cv.height = dim.h;
      const ctx = cv.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      const draw = (tMs: number) => {
        const s = useEditor.getState();
        renderAt(
          ctx,
          dim,
          {
            words: s.words,
            pages: s.pages,
            wordPage: s.wordPage,
            clips: s.clips,
            textAnchor: s.textAnchor,
            fontScale: s.fontScale,
            showSelection: false,
          },
          tMs,
        );
      };
      const blob = await exportOffline({
        file: st.file,
        dim,
        canvas: cv,
        drawFrame: draw,
        onProgress: (f) => setStatus(`rendering ${(f * 100).toFixed(0)}%`),
      });
      setDl({ url: URL.createObjectURL(blob), name: `brat-${st.aspect}.mp4`, size: blob.size });
      setStatus("done");
    } catch (e) {
      setStatus("error: " + (e instanceof Error ? e.message : String(e)));
      console.error(e);
    }
    setBusy(false);
    setExporting(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        className="bg-black text-white px-4 py-2 lowercase disabled:bg-[#c4c4c4]"
        onClick={run}
        disabled={!words.length || busy}
      >
        {busy ? "rendering…" : "export mp4"}
      </button>
      {status && <div className="text-xs text-[var(--muted)] font-mono">{status}</div>}
      {dl && (
        <a href={dl.url} download={dl.name} className="text-lg lowercase underline">
          ⬇ download {dl.name} ({(dl.size / 1e6).toFixed(1)} mb)
        </a>
      )}
      <p className="text-xs text-[var(--muted)] lowercase">
        renders offline — faster than real time, no need to keep the tab focused.
      </p>
    </div>
  );
}
