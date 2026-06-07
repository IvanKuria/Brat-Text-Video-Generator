# Brat Text Video Generator

Turn an audio file into a **brat**-style (Charli XCX) karaoke video — black text on white,
Arial Narrow, lowercase, justified edge-to-edge, softly blurred — perfectly synced to the
narration. Switch between **9:16** (TikTok/Shorts) and **16:9** (YouTube), preview in the
browser, and export an MP4.

![brat](fonts/) <!-- preview -->

## How it works

1. **Transcribe** — `transcribe.mjs` runs whisper.cpp (`medium.en`, via
   `@remotion/install-whisper-cpp`) on your audio → word-level `captions.json`.
2. **Render** — a plain HTML/CSS page (`index.html`) lays the words out in the brat
   aesthetic and reveals each word (ghost-gray → black) exactly as it's spoken, driven by
   `audio.currentTime`. Words are chunked to **≤3 per line, ≤4 lines per frame**, each line
   spread edge-to-edge; long lines auto-shrink to fit.
3. **Record** — `record.mjs` drives the page headless (Puppeteer), screenshots one frame per
   visual change, and uses ffmpeg's concat demuxer to hold each frame for its exact duration
   and mux the audio → a constant-30fps MP4.

## Requirements

- **Node.js** 18+
- **ffmpeg** / **ffprobe** on your PATH
- **Chrome / Chromium** for Puppeteer. Set the binary path via the `CHROME` env var, e.g.
  `export CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`
  (or install Chrome for Testing with `npx @puppeteer/browsers install chrome`).

## Setup

```bash
npm install
```

(First transcription auto-downloads whisper.cpp + the model into `whisper.cpp/`.)

## Use it (web UI)

```bash
node server.mjs        # → http://localhost:4180
```

Then: pick an audio file → **transcribe** → choose **9:16 / 16:9** → **preview** (click it,
press space to play) → **generate mp4** → **download**.

## Use it (CLI)

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
| `server.mjs` | Local web server (zero deps — built-in `http`) |
| `app.html` | The control UI |
| `index.html` | The brat render surface (served + recorded) |
| `record.mjs` | Headless frame capture → ffmpeg MP4 |
| `transcribe.mjs` | Audio → `captions.json` (whisper.cpp) |
| `build-standalone.mjs` | Generates the offline `reader.html` |
| `shoot.mjs` | Screenshot the reader at given times (verification) |
| `thumbnail.html` | Brat-style thumbnail template |
| `fonts/` | Bundled Arial Narrow (Regular for the video, Bold for UI) |

## Notes

- The video font is **Arial Narrow Regular**, lowercase, with a light `blur(2px)`.
- `narration.m4a`, `captions.json`, `reader.html`, `out.mp4`, `whisper.cpp/` and
  `node_modules/` are gitignored — they're your content or regenerated artifacts.
