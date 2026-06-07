# Brat Text Video Generator

Turn an audio file into a **brat**-style (Charli XCX) karaoke video — black text on white,
Arial Narrow, lowercase, justified edge-to-edge, softly blurred — synced word-by-word to the
narration. Switch between **9:16** (TikTok/Shorts) and **16:9** (YouTube).

There are two ways to run it:

## 1. Browser version (hosted, zero install)

`index.html` is a fully client-side app — transcription, rendering, and video export all run
**in your browser**, so it works on any static host (GitHub Pages, Vercel, etc.) with no server.

- **Audio**: a file picker — your file never leaves your device.
- **Transcription**: Whisper compiled to WebAssembly via [`transformers.js`](https://github.com/huggingface/transformers.js)
  (`tiny.en` / `base.en` / `small.en`), running on WebGPU when available. The model downloads
  once on first use.
- **Render**: the brat karaoke is drawn on a `<canvas>` (chunked to ≤3 words/line, ≤4 lines/frame,
  justified, auto-fit, light blur), revealing each word as it's spoken.
- **Export**: real-time `MediaRecorder` capture of canvas + audio → MP4 (falls back to WebM on
  browsers that can't record MP4).

Just open the hosted page (or `index.html` over any static server) and follow steps 1–4.

> Browser caveats: export records in real time (a 2-min clip takes ~2 min), keep the tab focused,
> and use Chrome/Edge for WebGPU + MP4 recording. For long videos or best transcription accuracy,
> use the local version below.

## 2. Local version (Node — fastest, best quality)

Uses native **whisper.cpp** (`medium.en`), headless **Chrome**, and native **ffmpeg** for a
frame-accurate render. This does **not** run on serverless hosts (it spawns native binaries) — it's
a desktop tool.

### Requirements
- Node.js 18+, **ffmpeg**/**ffprobe** on PATH
- Chrome/Chromium — set its path with `CHROME=...` (or `npx @puppeteer/browsers install chrome`)

### Web UI
```bash
npm install
node server.mjs        # → http://localhost:4180
```
Pick audio → transcribe → choose 9:16/16:9 → preview (space to play) → generate mp4 → download.

### CLI
```bash
# put your audio at ./narration.m4a, then:
node transcribe.mjs                       # -> captions.json
node build-standalone.mjs                 # -> reader.html (captions inlined, offline)
node record.mjs --aspect 9x16 --out out.mp4
node record.mjs --aspect 16x9 --sec 20    # 20s test in 16:9
```

## Files

| File | Role |
|------|------|
| `index.html` | **Browser app** (transformers.js + canvas + MediaRecorder) |
| `vercel.json` | Static-deploy config |
| `local-reader.html` | Local tool's brat render surface (DOM; recorded by Puppeteer) |
| `server.mjs` | Local web server (zero deps) |
| `app.html` | Local web UI |
| `record.mjs` | Headless frame capture → ffmpeg MP4 |
| `transcribe.mjs` | Audio → `captions.json` (whisper.cpp) |
| `build-standalone.mjs` | Generates the offline `reader.html` |
| `shoot.mjs` | Screenshot the reader (verification) |
| `thumbnail.html` | Brat-style thumbnail template |
| `fonts/` | Arial Narrow (Regular = video, Bold = UI) |

The video font is **Arial Narrow Regular**, lowercase, with a light `blur(2px)`.
`narration.m4a`, `captions.json`, `reader.html`, `out.mp4`, `whisper.cpp/`, and `node_modules/`
are gitignored — they're your content or regenerated artifacts.
