import type { Word } from "./types";

const normTok = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9']/g, "");

// Re-map timestamps from old words onto the user's edited token list.
// Unchanged words (LCS match) keep exact times; inserted words are interpolated
// by index between the nearest matched neighbours.
export function realign(oldWords: Word[], newTexts: string[]): Word[] {
  const a = oldWords.map((w) => normTok(w.text));
  const b = newTexts.map(normTok);
  const n = a.length;
  const m = b.length;
  const dp: Int32Array[] = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const starts: (number | null)[] = new Array(m).fill(null);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      starts[j] = oldWords[i].startMs;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }

  const known: number[] = [];
  starts.forEach((s, k) => {
    if (s != null) known.push(k);
  });
  const interp = (k: number): number => {
    let lo: number | null = null;
    let hi: number | null = null;
    for (const kk of known) {
      if (kk <= k) lo = kk;
      if (kk >= k) {
        hi = kk;
        break;
      }
    }
    if (lo != null && hi != null && lo !== hi)
      return starts[lo]! + (starts[hi]! - starts[lo]!) * ((k - lo) / (hi - lo));
    if (lo != null) return starts[lo]!;
    if (hi != null) return starts[hi]!;
    return 0;
  };

  const out: Word[] = newTexts.map((t, k) => {
    const s = Math.round(starts[k] != null ? (starts[k] as number) : interp(k));
    return { text: t, startMs: s, endMs: s };
  });
  let last = 0;
  for (const w of out) {
    if (w.startMs < last) w.startMs = last;
    w.endMs = Math.max(w.startMs, w.endMs);
    last = w.startMs;
  }
  return out;
}
