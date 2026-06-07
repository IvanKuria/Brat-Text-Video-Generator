// Build reader.html (portable, captions inlined) from local-reader.html + captions.json.
// reader.html is a GENERATED artifact — never hand-edit it; edit local-reader.html and rerun this.
// (file:// can't fetch local JSON, so the offline standalone must inline its captions.)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(dir, "local-reader.html"), "utf8");
const caps = fs.readFileSync(path.join(dir, "captions.json"), "utf8");

const marker = '<script>\nconst audio';
if (!html.includes(marker)) { console.error("marker not found in local-reader.html"); process.exit(1); }
const out = html.replace(marker, `<script>window.CAPTIONS=${caps};</script>\n${marker}`);

fs.writeFileSync(path.join(dir, "reader.html"), out);
console.log(`reader.html built (${(out.length/1024).toFixed(0)} KB)`);
