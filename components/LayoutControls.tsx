"use client";
import { useEditor } from "@/store/editor";
import type { Aspect, TextAnchor } from "@/lib/types";

const ASPECTS: Aspect[] = ["9x16", "16x9"];
const ANCHORS: TextAnchor[] = ["top", "center", "bottom"];

export default function LayoutControls() {
  const aspect = useEditor((s) => s.aspect);
  const setAspect = useEditor((s) => s.setAspect);
  const textAnchor = useEditor((s) => s.textAnchor);
  const setTextAnchor = useEditor((s) => s.setTextAnchor);
  const fontScale = useEditor((s) => s.fontScale);
  const setFontScale = useEditor((s) => s.setFontScale);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-4 flex-wrap">
        {ASPECTS.map((a) => (
          <label key={a} className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="aspect"
              checked={aspect === a}
              onChange={() => setAspect(a)}
            />
            {a === "9x16" ? "9:16" : "16:9"}
          </label>
        ))}
      </div>
      <div className="flex gap-4 flex-wrap items-center">
        <span className="text-[var(--muted)] text-sm lowercase">text:</span>
        {ANCHORS.map((t) => (
          <label key={t} className="inline-flex items-center gap-1.5 cursor-pointer lowercase">
            <input
              type="radio"
              name="anchor"
              checked={textAnchor === t}
              onChange={() => setTextAnchor(t)}
            />
            {t}
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm lowercase">
        size
        <input
          type="range"
          min={0.5}
          max={1.6}
          step={0.05}
          value={fontScale}
          onChange={(e) => setFontScale(parseFloat(e.target.value))}
        />
        <span className="font-mono text-xs text-[var(--muted)]">{fontScale.toFixed(2)}×</span>
      </label>
    </div>
  );
}
