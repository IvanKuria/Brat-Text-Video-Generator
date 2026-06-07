import { create } from "zustand";
import type { Word, Page, Aspect, TextAnchor } from "@/lib/types";
import { buildPages } from "@/lib/chunk";
import type { Clip } from "@/lib/media";
import { disposeClip } from "@/lib/media";

interface EditorState {
  file: File | null;
  audioUrl: string | null;
  audioEl: HTMLAudioElement | null;
  words: Word[];
  pages: Page[];
  wordPage: number[];
  clips: Clip[];
  selectedId: string | null;
  aspect: Aspect;
  textAnchor: TextAnchor;
  fontScale: number;
  playing: boolean;
  exporting: boolean;

  setFile: (f: File) => void;
  setAudioEl: (el: HTMLAudioElement | null) => void;
  setWords: (w: Word[]) => void;
  setAspect: (a: Aspect) => void;
  setTextAnchor: (t: TextAnchor) => void;
  setFontScale: (n: number) => void;
  setPlaying: (b: boolean) => void;
  setExporting: (b: boolean) => void;
  addClip: (c: Clip) => void;
  updateClip: (id: string, patch: Partial<Clip>) => void;
  removeClip: (id: string) => void;
  select: (id: string | null) => void;
}

export const useEditor = create<EditorState>((set, get) => ({
  file: null,
  audioUrl: null,
  audioEl: null,
  words: [],
  pages: [],
  wordPage: [],
  clips: [],
  selectedId: null,
  aspect: "9x16",
  textAnchor: "center",
  fontScale: 1,
  playing: false,
  exporting: false,

  setFile: (f) => {
    const prev = get().audioUrl;
    if (prev) URL.revokeObjectURL(prev);
    const url = URL.createObjectURL(f);
    set({ file: f, audioUrl: url });
    const el = get().audioEl;
    if (el) el.src = url;
  },
  setAudioEl: (el) => set({ audioEl: el }),
  setWords: (w) => {
    const { pages, wordPage } = buildPages(w);
    set({ words: w, pages, wordPage });
  },
  setAspect: (a) => set({ aspect: a }),
  setTextAnchor: (t) => set({ textAnchor: t }),
  setFontScale: (n) => set({ fontScale: n }),
  setPlaying: (b) => set({ playing: b }),
  setExporting: (b) => set({ exporting: b }),
  addClip: (c) => set((s) => ({ clips: [...s.clips, c], selectedId: c.id })),
  updateClip: (id, patch) =>
    set((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  removeClip: (id) =>
    set((s) => {
      const c = s.clips.find((x) => x.id === id);
      if (c) disposeClip(c);
      return {
        clips: s.clips.filter((x) => x.id !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
      };
    }),
  select: (id) => set({ selectedId: id }),
}));
