import type { Aspect } from "./types";

export interface Dim {
  w: number;
  h: number;
  font: number;
  pad: number;
}

export const DIMS: Record<Aspect, Dim> = {
  "9x16": { w: 1080, h: 1920, font: 132, pad: 60 },
  "16x9": { w: 1920, h: 1080, font: 150, pad: 120 },
};

export const SCALEX = 1.08; // brat horizontal stretch
export const BLUR = 2; // px, applied to text only
export const MINGAP_FRAC = 0.1; // min inter-word gap as fraction of font size
export const MAX_WORDS_PER_LINE = 3;
export const MAX_LINES_PER_FRAME = 4;
export const FPS = 30;
