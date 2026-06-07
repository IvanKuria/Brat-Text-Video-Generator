import { MAX_WORDS_PER_LINE, MAX_LINES_PER_FRAME } from "./dims";
import type { Word, Page } from "./types";

// Chunk words into frames of lines: <=3 words/line, <=4 lines/frame.
// Prefer ending a frame at sentence punctuation once it has >=2 lines.
export function buildPages(words: Word[]): { pages: Page[]; wordPage: number[] } {
  const pages: Page[] = [];
  let frameLines: number[][] = [];
  let curLine: number[] = [];
  const flushLine = () => {
    if (curLine.length) {
      frameLines.push(curLine);
      curLine = [];
    }
  };
  const flushFrame = () => {
    flushLine();
    if (frameLines.length) {
      pages.push(frameLines);
      frameLines = [];
    }
  };
  for (let i = 0; i < words.length; i++) {
    curLine.push(i);
    const ends = /[.?!]["”']?$/.test(words[i].text.trim());
    if (curLine.length >= MAX_WORDS_PER_LINE) flushLine();
    if (frameLines.length >= MAX_LINES_PER_FRAME) flushFrame();
    else if (ends && frameLines.length >= 2) flushFrame();
  }
  flushFrame();
  const wordPage = new Array<number>(words.length);
  pages.forEach((fr, pi) => fr.forEach((line) => line.forEach((wi) => (wordPage[wi] = pi))));
  return { pages, wordPage };
}

export function currentWordIndex(words: Word[], tMs: number): number {
  let idx = -1;
  for (let i = 0; i < words.length; i++) {
    if (words[i].startMs <= tMs) idx = i;
    else break;
  }
  return idx;
}
