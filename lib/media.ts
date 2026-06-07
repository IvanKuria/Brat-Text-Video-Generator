export type ClipType = "image" | "gif";

export interface GifFrame {
  bitmap: ImageBitmap;
  durMs: number;
}

export interface Clip {
  id: string;
  type: ClipType;
  name: string;
  url: string;
  img: HTMLImageElement; // static image, or gif first-frame fallback
  iw: number; // intrinsic width
  ih: number; // intrinsic height
  frames?: GifFrame[]; // decoded gif frames
  gifDurMs?: number;
  loaded: boolean;
  startMs: number;
  endMs: number;
  // transform, normalized 0..1 of canvas w/h (survives aspect switches)
  nx: number;
  ny: number;
  nw: number; // width fraction; height derived from intrinsic aspect ratio
}

let seq = 0;
export const nextClipId = () => `clip${++seq}`;

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

interface ImageDecoderResult {
  image: { duration?: number; close(): void };
}
interface ImageDecoderLike {
  tracks: { ready: Promise<void>; selectedTrack?: { frameCount: number } };
  decode(opts: { frameIndex: number }): Promise<ImageDecoderResult>;
  close(): void;
}
type ImageDecoderCtor = new (init: { data: ArrayBuffer; type: string }) => ImageDecoderLike;

// Decode an animated GIF into individual frames via the WebCodecs ImageDecoder API.
// Returns null when ImageDecoder is unavailable (caller falls back to a static first frame).
export async function decodeGif(
  url: string,
): Promise<{ frames: GifFrame[]; durMs: number } | null> {
  const Ctor = (globalThis as unknown as { ImageDecoder?: ImageDecoderCtor }).ImageDecoder;
  if (!Ctor) return null;
  const resp = await fetch(url);
  const data = await resp.arrayBuffer();
  const dec = new Ctor({ data, type: "image/gif" });
  await dec.tracks.ready;
  const count = dec.tracks.selectedTrack?.frameCount ?? 1;
  const frames: GifFrame[] = [];
  let durMs = 0;
  for (let i = 0; i < count; i++) {
    const { image } = await dec.decode({ frameIndex: i });
    const bitmap = await createImageBitmap(image as unknown as ImageBitmapSource);
    const durUs = image.duration ?? 100000;
    const ms = durUs / 1000 || 100;
    frames.push({ bitmap, durMs: ms });
    durMs += ms;
    image.close();
  }
  dec.close();
  return { frames, durMs };
}

export function resolveBitmap(c: Clip, tMs: number): CanvasImageSource | null {
  if (c.type === "image") return c.loaded ? c.img : null;
  if (c.frames && c.frames.length) {
    const loop = c.gifDurMs || 1;
    const t = (((tMs - c.startMs) % loop) + loop) % loop;
    let acc = 0;
    for (const f of c.frames) {
      acc += f.durMs;
      if (t < acc) return f.bitmap;
    }
    return c.frames[c.frames.length - 1].bitmap;
  }
  return c.loaded ? c.img : null; // gif fallback: static first frame
}

export function disposeClip(c: Clip) {
  try {
    if (c.url) URL.revokeObjectURL(c.url);
    c.frames?.forEach((f) => f.bitmap.close());
  } catch {
    /* noop */
  }
}
