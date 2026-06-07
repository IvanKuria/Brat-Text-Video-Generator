# Brat Text Video Generator

A browser-based mini video editor that turns an audio file into a **brat**-style
(Charli XCX) karaoke video — black lowercase Arial Narrow on white, justified
edge-to-edge, softly blurred — synced word-by-word to the narration. Drop images
and GIFs on a timeline, lay text around them, and export an MP4 in 9:16 or 16:9.

**Everything runs in the browser.** No server, no uploads — your audio never leaves
your device. Hostable as a static/SSR app on Vercel.

## What it does

1. **audio** — pick an audio (or video) file.
2. **transcribe** — Whisper runs in WebAssembly via [transformers.js](https://github.com/huggingface/transformers.js) (`tiny`/`base`/`small.en`, WebGPU when available), producing word-level timing. The model downloads once.
3. **edit transcript** — fix any misheard words; edits are diffed (LCS) against the original so unchanged words keep their exact timestamps and the video stays in sync.
4. **format** — 9:16 or 16:9, text anchor (top/center/bottom), and text size.
5. **media** — add images and animated GIFs at the playhead; drag to move and drag the corner to resize on the preview; trim timing on the timeline.
6. **export** — a deterministic **offline render** (WebCodecs `VideoEncoder` + `AudioEncoder`, muxed with `mp4-muxer`) writes a clean MP4. Faster than real time and tab-focus independent.

## Tech

- **Next.js 16** (App Router, client-only) + **React 19** + **Tailwind v4**, **Zustand** for editor state.
- `lib/` holds the framework-agnostic core: `render.ts` (`renderAt` — one pure-of-time draw routine shared by preview and export), `chunk.ts`, `realign.ts`, `transcribe.ts`, `media.ts` (GIF frames via the `ImageDecoder` API), `export.ts`.
- Brat font: **Arial Narrow Regular**, lowercase, `blur(2px)`, `scaleX(1.08)`.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Deploy

Push to a Vercel project (auto-detected Next.js, no config needed).

## Browser support

Best on **Chrome/Edge** (WebGPU transcription + WebCodecs export). Firefox/Safari can
transcribe and preview, but the WebCodecs MP4 export is Chromium-first.

> Note: Arial Narrow is a proprietary system font bundled in `public/fonts/`; swap for a
> metric-compatible free face (e.g. Liberation Sans Narrow) if distributing publicly.
