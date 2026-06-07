"use client";
import { useEditor } from "@/store/editor";
import { loadImage, decodeGif, nextClipId } from "@/lib/media";
import type { Clip } from "@/lib/media";

export default function MediaPanel() {
  const clips = useEditor((s) => s.clips);
  const selectedId = useEditor((s) => s.selectedId);
  const addClip = useEditor((s) => s.addClip);
  const updateClip = useEditor((s) => s.updateClip);
  const removeClip = useEditor((s) => s.removeClip);
  const select = useEditor((s) => s.select);

  async function onFiles(files: FileList | null) {
    if (!files) return;
    const el = useEditor.getState().audioEl;
    const startMs = el ? el.currentTime * 1000 : 0;
    for (const file of Array.from(files)) {
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      const type = /gif$/i.test(file.type) ? "gif" : "image";
      const clip: Clip = {
        id: nextClipId(),
        type,
        name: file.name,
        url,
        img,
        iw: img.naturalWidth,
        ih: img.naturalHeight,
        loaded: true,
        startMs,
        endMs: startMs + 3000,
        nx: 0.25,
        ny: 0.12,
        nw: 0.5,
      };
      addClip(clip);
      if (type === "gif") {
        decodeGif(url)
          .then((res) => {
            if (res) updateClip(clip.id, { frames: res.frames, gifDurMs: res.durMs });
          })
          .catch((e) => console.error("gif decode", e));
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="file"
        accept="image/*"
        multiple
        className="text-sm max-w-full"
        onChange={(e) => onFiles(e.target.files)}
      />
      <p className="text-xs text-[var(--muted)] lowercase">
        added at the playhead. drag on the preview to move, drag the corner to resize.
      </p>
      {clips.length > 0 && (
        <ul className="flex flex-col gap-2">
          {clips.map((c) => {
            const sel = c.id === selectedId;
            return (
              <li
                key={c.id}
                className={`border p-2 ${sel ? "border-black" : "border-[var(--line)]"}`}
                onClick={() => select(c.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm truncate lowercase">
                    {c.type === "gif" ? "◇ " : "▢ "}
                    {c.name}
                  </span>
                  <button
                    className="text-xs underline lowercase"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeClip(c.id);
                    }}
                  >
                    remove
                  </button>
                </div>
                {sel && (
                  <div className="flex gap-3 mt-2 text-xs lowercase">
                    <label className="flex items-center gap-1">
                      in
                      <input
                        type="number"
                        step={0.1}
                        min={0}
                        value={(c.startMs / 1000).toFixed(1)}
                        className="w-16 border border-[var(--line)] px-1"
                        onChange={(e) =>
                          updateClip(c.id, { startMs: parseFloat(e.target.value) * 1000 })
                        }
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      out
                      <input
                        type="number"
                        step={0.1}
                        min={0}
                        value={(c.endMs / 1000).toFixed(1)}
                        className="w-16 border border-[var(--line)] px-1"
                        onChange={(e) =>
                          updateClip(c.id, { endMs: parseFloat(e.target.value) * 1000 })
                        }
                      />
                    </label>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
