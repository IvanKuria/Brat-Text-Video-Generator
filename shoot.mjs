// Screenshot the reader at given times (seconds) for visual verification.
//   node shoot.mjs 9 90 300          # 9x16 (default), needs server on :4180
//   node shoot.mjs --aspect 16x9 9 90 300
// Output: /tmp/reader_<aspect>_t<t>.png
import puppeteer from "puppeteer-core";
const EXEC=process.env.CHROME||"/Users/ivankuria/.cache/puppeteer/chrome/mac_arm-145.0.7632.77/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const DIMS={ "9x16":{w:1080,h:1920}, "16x9":{w:1920,h:1080} };

const args=process.argv.slice(2);
let aspect="9x16";
const ai=args.indexOf("--aspect");
if(ai>=0){ aspect=(args[ai+1]||"9x16").replace(":","x"); args.splice(ai,2); }
if(!DIMS[aspect]) aspect="9x16";
const D=DIMS[aspect];
const times=args;

const b=await puppeteer.launch({executablePath:EXEC,headless:"new",args:["--no-sandbox"],defaultViewport:{width:D.w,height:D.h}});
const p=await b.newPage();
for(const t of times){
  await p.goto(`http://localhost:4180/reader?aspect=${aspect}&t=${t}`,{waitUntil:"networkidle0"});
  await p.evaluate(()=>document.fonts.ready);
  await new Promise(r=>setTimeout(r,700));
  await p.screenshot({path:`/tmp/reader_${aspect}_t${t}.png`});
  process.stdout.write(`t${t} `);
}
await b.close(); console.log("done");
