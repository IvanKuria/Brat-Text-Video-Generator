import { FPS } from "./dims";
import type { Dim } from "./dims";

/* eslint-disable @typescript-eslint/no-explicit-any */
// WebCodecs types aren't in the default TS DOM lib; access via globalThis with light typing.
const G = globalThis as any;

export function supportsWebCodecs(): boolean {
  return (
    typeof G.VideoEncoder !== "undefined" &&
    typeof G.AudioEncoder !== "undefined" &&
    typeof G.VideoFrame !== "undefined"
  );
}

async function pickVideoCodec(dim: Dim): Promise<string | null> {
  const cands = ["avc1.640028", "avc1.4d0028", "avc1.640034", "avc1.42e028"];
  for (const codec of cands) {
    try {
      const { supported } = await G.VideoEncoder.isConfigSupported({
        codec,
        width: dim.w,
        height: dim.h,
        bitrate: 8_000_000,
        framerate: FPS,
      });
      if (supported) return codec;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function decodeAudio(file: File): Promise<AudioBuffer> {
  const buf = await file.arrayBuffer();
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  const ac = new AC();
  const decoded = await ac.decodeAudioData(buf);
  ac.close();
  return decoded;
}

const drain = (enc: any, max: number) =>
  new Promise<void>((res) => {
    const check = () => (enc.encodeQueueSize <= max ? res() : setTimeout(check, 4));
    check();
  });

export interface ExportOpts {
  file: File;
  dim: Dim;
  canvas: HTMLCanvasElement | OffscreenCanvas;
  drawFrame: (tMs: number) => void; // paints `canvas` at the given time
  onProgress?: (frac: number) => void;
}

// Deterministic offline render: step a virtual 30fps clock, encode each frame with
// WebCodecs, encode the audio, mux to MP4. No real-time playback => no tab-focus hang.
export async function exportOffline(opts: ExportOpts): Promise<Blob> {
  const { file, dim, canvas, drawFrame, onProgress } = opts;
  const codec = await pickVideoCodec(dim);
  if (!codec) throw new Error("no supported H.264 encoder config");

  const audioBuf = await decodeAudio(file);
  const sampleRate = audioBuf.sampleRate;
  const channels = audioBuf.numberOfChannels;
  const durationSec = audioBuf.duration;

  const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width: dim.w, height: dim.h },
    audio: { codec: "aac", numberOfChannels: channels, sampleRate },
    fastStart: "in-memory",
  });

  // ---- video ----
  const venc = new G.VideoEncoder({
    output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
    error: (e: any) => console.error("VideoEncoder", e),
  });
  venc.configure({ codec, width: dim.w, height: dim.h, bitrate: 8_000_000, framerate: FPS });

  const frameCount = Math.max(1, Math.ceil(durationSec * FPS));
  const frameDurUs = Math.round(1e6 / FPS);
  for (let f = 0; f < frameCount; f++) {
    const tMs = (f / FPS) * 1000;
    drawFrame(tMs);
    const frame = new G.VideoFrame(canvas, { timestamp: f * frameDurUs, duration: frameDurUs });
    venc.encode(frame, { keyFrame: f % (FPS * 2) === 0 });
    frame.close();
    if (venc.encodeQueueSize > 10) await drain(venc, 4);
    if (f % 6 === 0) {
      onProgress?.((f / frameCount) * 0.9);
      await new Promise((r) => setTimeout(r)); // yield so the UI/progress repaint
    }
  }
  await venc.flush();

  // ---- audio ----
  const aenc = new G.AudioEncoder({
    output: (chunk: any, meta: any) => muxer.addAudioChunk(chunk, meta),
    error: (e: any) => console.error("AudioEncoder", e),
  });
  aenc.configure({ codec: "mp4a.40.2", sampleRate, numberOfChannels: channels, bitrate: 128_000 });

  const chanData: Float32Array[] = [];
  for (let c = 0; c < channels; c++) chanData.push(audioBuf.getChannelData(c));
  const total = audioBuf.length;
  const block = 30000;
  for (let start = 0; start < total; start += block) {
    const n = Math.min(block, total - start);
    const planar = new Float32Array(n * channels);
    for (let c = 0; c < channels; c++) planar.set(chanData[c].subarray(start, start + n), c * n);
    const ad = new G.AudioData({
      format: "f32-planar",
      sampleRate,
      numberOfFrames: n,
      numberOfChannels: channels,
      timestamp: Math.round((start / sampleRate) * 1e6),
      data: planar,
    });
    aenc.encode(ad);
    ad.close();
    if (aenc.encodeQueueSize > 10) await drain(aenc, 4);
  }
  await aenc.flush();

  muxer.finalize();
  onProgress?.(1);
  venc.close();
  aenc.close();
  const { buffer } = muxer.target as { buffer: ArrayBuffer };
  return new Blob([buffer], { type: "video/mp4" });
}
