import { SCALEX, BLUR, MINGAP_FRAC } from "./dims";
import type { Dim } from "./dims";
import type { Word, Page, TextAnchor } from "./types";
import { currentWordIndex } from "./chunk";
import { resolveBitmap } from "./media";
import type { Clip } from "./media";

export interface RenderState {
  words: Word[];
  pages: Page[];
  wordPage: number[];
  clips: Clip[];
  textAnchor: TextAnchor;
  fontScale: number;
  selectedId?: string | null;
  showSelection?: boolean;
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const lc = (s: string) => s.trim().toLowerCase();
const FONT = (px: number) => `${px}px ArialNarrow, Arial, sans-serif`;

// The single, pure-of-time draw routine shared by live preview and offline export.
export function renderAt(ctx: Ctx, dim: Dim, state: RenderState, tMs: number) {
  const { w, h } = dim;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = "none";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);

  // 1) media clips — crisp (no blur), drawn under the text
  for (const c of state.clips) {
    if (tMs < c.startMs || tMs > c.endMs) continue;
    const bmp = resolveBitmap(c, tMs);
    if (!bmp) continue;
    const cw = c.nw * w;
    const ar = c.ih / c.iw || 1;
    ctx.drawImage(bmp, c.nx * w, c.ny * h, cw, cw * ar);
  }

  // 2) brat text
  if (state.words.length && state.pages.length) {
    const cwi = currentWordIndex(state.words, tMs);
    const pi = cwi < 0 ? 0 : state.wordPage[cwi];
    drawTextFrame(ctx, dim, state, pi, tMs);
  }

  // 3) selection chrome (preview only — never recorded)
  if (state.showSelection && state.selectedId) {
    const c = state.clips.find((x) => x.id === state.selectedId);
    if (c) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.filter = "none";
      const cw = c.nw * w;
      const ch = cw * (c.ih / c.iw || 1);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = Math.max(2, w * 0.0025);
      ctx.strokeRect(c.nx * w, c.ny * h, cw, ch);
      const hs = Math.max(16, w * 0.018);
      ctx.fillStyle = "#000";
      ctx.fillRect(c.nx * w + cw - hs / 2, c.ny * h + ch - hs / 2, hs, hs);
    }
  }
}

function frameFontPx(ctx: Ctx, dim: Dim, state: RenderState, pi: number): number {
  const base = dim.font * state.fontScale;
  const layoutW = (dim.w - 2 * dim.pad) / SCALEX;
  let scale = 1;
  ctx.font = FONT(base);
  for (const line of state.pages[pi]) {
    let sum = 0;
    for (const wi of line) sum += ctx.measureText(lc(state.words[wi].text)).width;
    const need = sum + (line.length - 1) * base * MINGAP_FRAC;
    if (need > layoutW) scale = Math.min(scale, layoutW / need);
  }
  return base * scale;
}

function drawTextFrame(ctx: Ctx, dim: Dim, state: RenderState, pi: number, tMs: number) {
  const { w, h, pad } = dim;
  const fontPx = frameFontPx(ctx, dim, state, pi);
  const layoutW = (w - 2 * pad) / SCALEX;
  const x0 = (w - layoutW) / 2;
  const lineH = fontPx * 1.04;
  const totalH = state.pages[pi].length * lineH;
  let yTop: number;
  if (state.textAnchor === "top") yTop = pad;
  else if (state.textAnchor === "bottom") yTop = h - pad - totalH;
  else yTop = h / 2 - totalH / 2;
  let y = yTop + fontPx * 0.8;

  ctx.setTransform(SCALEX, 0, 0, 1, (w / 2) * (1 - SCALEX), 0);
  ctx.textBaseline = "alphabetic";
  ctx.font = FONT(fontPx);
  ctx.filter = `blur(${BLUR}px)`;
  for (const line of state.pages[pi]) {
    const widths = line.map((wi) => ctx.measureText(lc(state.words[wi].text)).width);
    const sum = widths.reduce((a, b) => a + b, 0);
    const n = line.length;
    const pos: number[] = [];
    if (n === 1) pos.push(x0 + (layoutW - widths[0]) / 2);
    else {
      const gap = (layoutW - sum) / (n - 1);
      let x = x0;
      for (let i = 0; i < n; i++) {
        pos.push(x);
        x += widths[i] + gap;
      }
    }
    for (let i = 0; i < n; i++) {
      const wi = line[i];
      ctx.fillStyle = state.words[wi].startMs <= tMs ? "#000" : "#bdbdbd";
      ctx.fillText(lc(state.words[wi].text), pos[i], y);
    }
    y += lineH;
  }
  ctx.filter = "none";
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
