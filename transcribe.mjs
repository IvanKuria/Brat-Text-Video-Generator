import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import fs from "fs";
import { downloadWhisperModel, installWhisperCpp, transcribe, toCaptions } from "@remotion/install-whisper-cpp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WHISPER_VERSION = "1.7.4";
const MODEL = "medium.en";
const WHISPER_DIR = path.join(__dirname, "whisper.cpp");
const M4A = path.join(__dirname, "narration.m4a");
const WAV = path.join(__dirname, "narration.16k.wav");
const OUT = path.join(__dirname, "captions.json");

await installWhisperCpp({ to: WHISPER_DIR, version: WHISPER_VERSION });
await downloadWhisperModel({ model: MODEL, folder: WHISPER_DIR });
execFileSync("ffmpeg", ["-y", "-i", M4A, "-ar", "16000", "-ac", "1", WAV], { stdio: "inherit" });
const whisperCppOutput = await transcribe({ model: MODEL, whisperPath: WHISPER_DIR, whisperCppVersion: WHISPER_VERSION, inputPath: WAV, tokenLevelTimestamps: true });
const { captions } = toCaptions({ whisperCppOutput });
fs.writeFileSync(OUT, JSON.stringify(captions, null, 2));
console.log(`wrote ${captions.length} captions -> ${OUT}`);
