"use client";
import { useEffect, useRef, useState } from "react";
import { useEditor } from "@/store/editor";
import Uploader from "@/components/Uploader";
import Transcriber from "@/components/Transcriber";
import TranscriptEditor from "@/components/TranscriptEditor";
import LayoutControls from "@/components/LayoutControls";
import ExportBar from "@/components/ExportBar";
import PreviewCanvas from "@/components/PreviewCanvas";

function Section({
  n,
  title,
  children,
}: {
  n?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="text-lg lowercase mb-2">
        {n ? `${n} · ` : ""}
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Home() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const setAudioEl = useEditor((s) => s.setAudioEl);
  const audioUrl = useEditor((s) => s.audioUrl);
  const words = useEditor((s) => s.words);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setAudioEl(audioRef.current);
    return () => setAudioEl(null);
  }, [setAudioEl]);

  useEffect(() => {
    if (audioRef.current && audioUrl) audioRef.current.src = audioUrl;
  }, [audioUrl]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const sync = () => setPlaying(!el.paused);
    el.addEventListener("play", sync);
    el.addEventListener("pause", sync);
    el.addEventListener("ended", sync);
    return () => {
      el.removeEventListener("play", sync);
      el.removeEventListener("pause", sync);
      el.removeEventListener("ended", sync);
    };
  }, []);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play();
    else el.pause();
  }

  return (
    <main className="grid grid-cols-[420px_1fr] min-h-screen">
      <div className="border-r border-[var(--line)] p-7 overflow-auto">
        <h1 className="text-5xl lowercase leading-none tracking-tight">
          brat video
          <br />
          generator
        </h1>
        <p className="text-[var(--muted)] mt-1 mb-6 lowercase">
          audio in, brat-style video out. in your browser.
        </p>
        <Section n="1" title="audio">
          <Uploader />
        </Section>
        <Section n="2" title="transcribe">
          <Transcriber />
        </Section>
        {words.length > 0 && (
          <Section title="edit transcript">
            <TranscriptEditor />
          </Section>
        )}
        <Section n="3" title="format">
          <LayoutControls />
        </Section>
        <Section n="4" title="export">
          <ExportBar />
        </Section>
      </div>
      <div className="flex flex-col items-center justify-center gap-4 p-6 bg-[#fafafa]">
        <PreviewCanvas />
        <button
          onClick={toggle}
          disabled={!words.length}
          className="border-2 border-black px-4 py-2 lowercase disabled:opacity-40"
        >
          {playing ? "⏸ pause" : "▶ play"}
        </button>
      </div>
      <audio ref={audioRef} hidden />
    </main>
  );
}
