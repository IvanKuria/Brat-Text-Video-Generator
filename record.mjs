// Frame-accurate MP4 recorder for the brat reader.
//
// How it works: the reader (in ?capture=1 mode) exposes window.__frames (every
// visual-change time in ms — i.e. each word's start) and window.__seek(ms) which
// renders that exact state synchronously with no transitions. We screenshot one PNG
// per change time, then hand ffmpeg a concat list where each PNG is held for its exact
// duration, and mux the narration. Result: a constant-30fps MP4 perfectly synced to
// the VO, from ~2.5k screenshots instead of ~21k.
//
// Usage:
//   node record.mjs                                  # full video, 9x16 -> out.mp4 (standalone reader.html)
//   node record.mjs --aspect 16x9                    # 16:9
//   node record.mjs --sec 20 --out test.mp4          # first 20s
//   node record.mjs --url http://localhost:4180/reader --aspect 9x16   # render the served page
//
// Flags: --aspect 9x16|16x9  --url <baseURL>  --sec <N>  --out <file>

import puppeteer from "puppeteer-core";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXEC = process.env.CHROME || "/Users/ivankuria/.cache/puppeteer/chrome/mac_arm-145.0.7632.77/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

// canvas dimensions per aspect (must match the DIMS map in index.html)
const DIMS = {
  "9x16": { w: 1080, h: 1920 },
  "16x9": { w: 1920, h: 1080 },
};

// ---- args ----
function flag(name, def) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
let aspect = (flag("aspect", "9x16") || "9x16").replace(":", "x").trim();
if (!DIMS[aspect]) aspect = "9x16";
const D = DIMS[aspect];
const baseUrl = flag("url", null); // e.g. http://localhost:4180/reader
const maxSec = flag("sec", null) ? parseFloat(flag("sec")) : Infinity;
const OUT = path.join(__dirname, flag("out", "out.mp4"));

// Render the served page if given, else the offline standalone reader.html.
const READER = (baseUrl
  ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}capture=1`
  : "file://" + path.join(__dirname, "reader.html") + "?capture=1") + `&aspect=${aspect}`;
const AUDIO = path.join(__dirname, "narration.m4a");
const FRAMES_DIR = path.join(__dirname, ".frames");

const FPS = 30;
const TAIL_MS = 600; // hold the last frame briefly past the final word

function audioDurationSec() {
  try {
    const out = execFileSync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1", AUDIO,
    ]).toString().trim();
    const d = parseFloat(out);
    return Number.isFinite(d) ? d : null;
  } catch { return null; }
}

const pad = (n) => String(n).padStart(6, "0");

// ---- capture frames ----
fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
fs.mkdirSync(FRAMES_DIR, { recursive: true });

console.log(`aspect ${aspect} (${D.w}x${D.h}) — loading ${READER}`);
const b = await puppeteer.launch({
  executablePath: EXEC, headless: "new", args: ["--no-sandbox"],
  defaultViewport: { width: D.w, height: D.h, deviceScaleFactor: 1 },
});
const p = await b.newPage();
await p.goto(READER, { waitUntil: "networkidle0" });
await p.evaluate(() => document.fonts.ready);

let times = await p.evaluate(() => window.__frames || []);
times = [...new Set(times)].sort((a, b) => a - b);
if (times[0] > 0) times.unshift(0);

const durSec = audioDurationSec();
let endMs = (durSec ? durSec * 1000 : times[times.length - 1]) + TAIL_MS;
if (maxSec !== Infinity) {
  endMs = Math.min(endMs, maxSec * 1000);
  times = times.filter((t) => t < endMs);
}

console.log(`audio ${durSec ? durSec.toFixed(1) + "s" : "unknown"}, capturing ${times.length} frames -> ${endMs / 1000}s`);

for (let i = 0; i < times.length; i++) {
  await p.evaluate((ms) => window.__seek(ms), times[i]);
  await new Promise((r) => setTimeout(r, 12)); // let layout/blur/fit settle
  await p.screenshot({ path: path.join(FRAMES_DIR, `f${pad(i)}.png`) });
  if (i % 100 === 0) process.stdout.write(`${i} `);
}
await b.close();
console.log("\nframes captured");

// ---- build ffmpeg concat list (per-frame hold durations) ----
let list = "";
for (let i = 0; i < times.length; i++) {
  const next = i + 1 < times.length ? times[i + 1] : endMs;
  let d = (next - times[i]) / 1000;
  if (d <= 0) d = 1 / FPS;
  list += `file '${path.join(FRAMES_DIR, `f${pad(i)}.png`)}'\nduration ${d.toFixed(3)}\n`;
}
// concat demuxer ignores the last entry's duration unless the file is repeated
list += `file '${path.join(FRAMES_DIR, `f${pad(times.length - 1)}.png`)}'\n`;
const listPath = path.join(FRAMES_DIR, "list.txt");
fs.writeFileSync(listPath, list);

// ---- encode ----
console.log(`encoding -> ${OUT}`);
execFileSync("ffmpeg", [
  "-y",
  "-f", "concat", "-safe", "0", "-i", listPath,
  "-i", AUDIO,
  "-r", String(FPS), "-fps_mode", "cfr",
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "18",
  "-c:a", "aac", "-b:a", "192k",
  "-shortest", "-movflags", "+faststart",
  OUT,
], { stdio: "inherit" });

fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
console.log(`done: ${OUT}`);
