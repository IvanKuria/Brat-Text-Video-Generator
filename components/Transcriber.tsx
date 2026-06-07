"use client";
import { useState } from "react";
import { useEditor } from "@/store/editor";
import { transcribe } from "@/lib/transcribe";

const MODELS = [
  { v: "Xenova/whisper-tiny.en", label: "tiny.en — fastest" },
  { v: "Xenova/whisper-base.en", label: "base.en — balanced" },
  { v: "Xenova/whisper-small.en", label: "small.en — best (slow)" },
];

export default function Transcriber() {
  const file = useEditor((s) => s.file);
  const setWords = useEditor((s) => s.setWords);
  const [model, setModel] = useState("Xenova/whisper-base.en");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function run() {
    if (!file) return;
    setBusy(true);
    setStatus("working… (first run downloads the model)");
    try {
      const words = await transcribe(file, model, (p) => {
        if (p.status === "progress" && p.progress != null)
          setStatus(`downloading ${p.file || ""} ${p.progress.toFixed(0)}%`);
      });
      setWords(words);
      setStatus(`done — ${words.length} words`);
    } catch (e) {
      setStatus("error: " + (e instanceof Error ? e.message : String(e)));
      console.error(e);
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 items-center flex-wrap">
        <select
          className="text-base p-1 border border-[var(--line)]"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={busy}
        >
          {MODELS.map((m) => (
            <option key={m.v} value={m.v}>
              {m.label}
            </option>
          ))}
        </select>
        <button
          className="bg-black text-white px-4 py-2 lowercase disabled:bg-[#c4c4c4]"
          onClick={run}
          disabled={!file || busy}
        >
          {busy ? "working…" : "transcribe"}
        </button>
      </div>
      {status && (
        <div className="text-xs text-[var(--muted)] font-mono whitespace-pre-wrap">{status}</div>
      )}
    </div>
  );
}
