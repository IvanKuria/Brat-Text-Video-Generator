"use client";
import { useEffect, useState } from "react";
import { useEditor } from "@/store/editor";
import { realign } from "@/lib/realign";

export default function TranscriptEditor() {
  const words = useEditor((s) => s.words);
  const setWords = useEditor((s) => s.setWords);
  const [text, setText] = useState("");

  // refill the box whenever a fresh transcription arrives
  useEffect(() => {
    setText(words.map((w) => w.text.trim()).join(" "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.length]);

  if (!words.length) return null;

  function apply() {
    const toks = text.split(/\s+/).filter(Boolean);
    if (!toks.length) return;
    setWords(realign(words, toks));
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        className="w-full text-base leading-relaxed p-2 border border-[var(--line)] resize-y"
        rows={6}
        spellCheck
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="border-2 border-black px-4 py-2 lowercase self-start" onClick={apply}>
        apply edits
      </button>
      <p className="text-xs text-[var(--muted)] lowercase">
        fix misheard words, then apply — timing stays synced.
      </p>
    </div>
  );
}
