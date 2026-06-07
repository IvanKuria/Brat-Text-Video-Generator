// Local brat-video tool server (zero deps — built-in http only).
//
//   node server.mjs        # then open http://localhost:4180
//
// Flow: upload audio -> transcribe (whisper) -> preview (/reader) -> generate MP4.
// The browser POSTs the chosen File as the raw request body (no multipart needed).
import http from "http";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4180;
const BASE = `http://localhost:${PORT}`;

const AUDIO = path.join(__dirname, "narration.m4a");
const CAPTIONS = path.join(__dirname, "captions.json");
const OUT = path.join(__dirname, "out.mp4");

const MIME = {
  ".html": "text/html", ".json": "application/json", ".js": "text/javascript",
  ".css": "text/css", ".png": "image/png", ".ttf": "font/ttf",
  ".m4a": "audio/mp4", ".mp4": "video/mp4", ".wav": "audio/wav",
};

function serveFile(res, file, { download } = {}) {
  if (!fs.existsSync(file)) { res.writeHead(404).end("not found: " + path.basename(file)); return; }
  const ext = path.extname(file).toLowerCase();
  const headers = { "Content-Type": MIME[ext] || "application/octet-stream" };
  if (download) headers["Content-Disposition"] = `attachment; filename="${path.basename(file)}"`;
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
}

// Run a node script and stream its stdout/stderr to the response as plain text.
function spawnStream(res, args, doneMsg) {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" });
  const child = spawn(process.execPath, args, { cwd: __dirname });
  child.stdout.on("data", (d) => res.write(d));
  child.stderr.on("data", (d) => res.write(d));
  child.on("close", (code) => {
    res.write(`\n${code === 0 ? (doneMsg || "OK") : "FAILED (exit " + code + ")"}\n`);
    res.end();
  });
  child.on("error", (e) => { res.write("\nERROR " + e.message + "\n"); res.end(); });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, BASE);
  const p = url.pathname;

  if (req.method === "POST" && p === "/upload") {
    const out = fs.createWriteStream(AUDIO);
    req.pipe(out);
    out.on("finish", () => res.writeHead(200).end("uploaded"));
    out.on("error", (e) => res.writeHead(500).end(String(e)));
    return;
  }

  if (req.method === "POST" && p === "/transcribe") {
    // transcribe.mjs reads narration.m4a -> captions.json, then rebuild the standalone.
    spawnStream(res, ["-e",
      `import('node:child_process').then(async cp=>{` +
      `cp.execFileSync(process.execPath,['transcribe.mjs'],{stdio:'inherit'});` +
      `cp.execFileSync(process.execPath,['build-standalone.mjs'],{stdio:'inherit'});});`,
    ], "DONE transcribe");
    return;
  }

  if (req.method === "POST" && p === "/generate") {
    let aspect = (url.searchParams.get("aspect") || "9x16").replace(":", "x");
    if (!["9x16", "16x9"].includes(aspect)) aspect = "9x16";
    const sec = url.searchParams.get("sec");
    const args = ["record.mjs", "--aspect", aspect, "--url", `${BASE}/reader`];
    if (sec) args.push("--sec", sec);
    spawnStream(res, args, "DONE /download");
    return;
  }

  if (req.method === "GET") {
    if (p === "/") return serveFile(res, path.join(__dirname, "app.html"));
    if (p === "/reader") return serveFile(res, path.join(__dirname, "index.html"));
    if (p === "/download") return serveFile(res, OUT, { download: true });
    // static (within this dir only)
    const file = path.normalize(path.join(__dirname, decodeURIComponent(p)));
    if (!file.startsWith(__dirname)) return void res.writeHead(403).end("forbidden");
    return serveFile(res, file);
  }

  res.writeHead(404).end("not found");
});

server.listen(PORT, () => {
  console.log(`brat tool: ${BASE}`);
  console.log(`  audio:    ${fs.existsSync(AUDIO) ? "narration.m4a present" : "none uploaded yet"}`);
  console.log(`  captions: ${fs.existsSync(CAPTIONS) ? "captions.json present" : "none — transcribe first"}`);
});
