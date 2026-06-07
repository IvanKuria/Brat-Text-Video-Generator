"use client";
import { useEditor } from "@/store/editor";

export default function Uploader() {
  const setFile = useEditor((s) => s.setFile);
  const file = useEditor((s) => s.file);
  return (
    <div>
      <input
        type="file"
        accept="audio/*,video/*"
        className="text-sm max-w-full"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setFile(f);
        }}
      />
      {file && <p className="text-[var(--muted)] text-sm mt-1 lowercase">loaded: {file.name}</p>}
    </div>
  );
}
