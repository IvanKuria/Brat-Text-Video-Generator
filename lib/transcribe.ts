import type { Word } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
// transformers.js is untyped here; dynamic import keeps it out of SSR/initial bundle.
let transcriber: any = null;
let loadedModel = "";

export type ProgressCb = (p: { status?: string; file?: string; progress?: number }) => void;

export async function getTranscriber(model: string, onProgress?: ProgressCb) {
  if (transcriber && loadedModel === model) return transcriber;
  const { pipeline, env } = await import("@huggingface/transformers");
  env.allowLocalModels = false;
  transcriber = await pipeline("automatic-speech-recognition", model, {
    device: (navigator as any).gpu ? "webgpu" : "wasm",
    progress_callback: onProgress,
  });
  loadedModel = model;
  return transcriber;
}

// decode any audio file to 16k mono Float32 for whisper
export async function decodeTo16k(file: File): Promise<Float32Array> {
  const buf = await file.arrayBuffer();
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  const ac = new AC();
  const decoded = await ac.decodeAudioData(buf);
  const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const rendered = await off.startRendering();
  ac.close();
  return rendered.getChannelData(0);
}

function normalizeChunks(chunks: { text: string; timestamp: (number | null)[] }[]): Word[] {
  const out: Word[] = [];
  let last = 0;
  for (const c of chunks) {
    const t = c.timestamp || [];
    let s = t[0] == null ? last : t[0];
    let e = t[1] == null ? s : t[1];
    if (e < s) e = s;
    out.push({ text: c.text, startMs: Math.round(s * 1000), endMs: Math.round(e * 1000) });
    last = e;
  }
  return out;
}

export async function transcribe(
  file: File,
  model: string,
  onProgress?: ProgressCb,
): Promise<Word[]> {
  const t = await getTranscriber(model, onProgress);
  const data = await decodeTo16k(file);
  const out = await t(data, {
    return_timestamps: "word",
    chunk_length_s: 30,
    stride_length_s: 5,
  });
  return normalizeChunks(out.chunks || []);
}
