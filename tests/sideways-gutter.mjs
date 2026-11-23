// Sideways phone: the game stops before the side buttons, so SHOOT
// does not cover dialog text. Upright keeps the panel under the screen.
import { createRequire } from "node:module";
import path from "path";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const URL = process.env.HRURL || pathToFileURL(path.resolve("index.html")).href;
const CHROME = process.env.CHROME || "/usr/bin/google-chrome";
let pass=0, fail=0;
const bad=[];
const ok=(c,m)=>{ if(c) pass++; else { fail++; bad.push(m); } console.log((c?"PASS ":"FAIL ")+m); };
const over=(a,b)=>a.x<b.r-1 && a.r>b.x+1 && a.y<b.b-1 && a.b>b.y+1;
const browser = await chromium.launch({ executablePath: CHROME, args:["--no-sandbox","--disable-dev-shm-usage"] });
for (const [w,h,name] of [[844,390,"sideways"],[390,844,"upright"]]) {
  const ctx = await browser.newContext({ viewport:{width:w,height:h}, isMobile:true, hasTouch:true, deviceScaleFactor:1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__HR_DEBUG = true; localStorage.clear(); });
  await page.goto(URL);
  await page.waitForFunction(() => window.__HR && __HR.G);
  await page.waitForTimeout(400);
  if (name==="sideways") {
    await page.evaluate(() => { try { __HR.G.newGame(); } catch(e){} __HR.step(40); });
    await page.waitForTimeout(300);
  }
  const g = await page.evaluate(() => {
    const box = e => { const a=e.getBoundingClientRect(); return {x:a.x,y:a.y,r:a.right,b:a.bottom,w:a.width,h:a.height}; };
    const cv = box(document.getElementById("game"));
    const btns = [...document.querySelectorAll("#srml-act [data-b], #srml-dir .srml-b, #srml-menu .srml-b, #stick")].filter(e=>e.offsetParent).map(e=>({t:(e.dataset.b||e.dataset.srml||e.id||e.textContent||"").trim().slice(0,12), ...box(e)}));
    return { cv, btns, dialog: __HR.G.ov && __HR.G.ov.k, line: __HR.G.ov && __HR.G.ov.lines && __HR.G.ov.lines[0] && __HR.G.ov.lines[0][1] };
  });
  const shoot = g.btns.find(b=>b.t==="shoot");
  const stick = g.btns.find(b=>b.t==="stick");
  if (name==="sideways") {
    ok(!!shoot, "sideways SHOOT is on the panel");
    ok(shoot && !over(shoot, g.cv), "sideways SHOOT does not cover the game "+JSON.stringify({shoot,cv:g.cv}));
    ok(!stick || !over(stick, g.cv), "sideways stick does not cover the game");
    for (const b of g.btns) ok(!over(b, g.cv), "sideways "+b.t+" stays off the game");
    ok(g.dialog==="dialog" && /Hall of Mirrors|dreaming/.test(g.line||""), "sideways dialog is open: "+(g.line||"").slice(0,60));
    ok(g.btns.every(b => b.x >= -0.5 && b.y >= -0.5 && b.r <= w + 0.5 && b.b <= h + 0.5), "sideways every control stays inside "+w+"x"+h);
    await page.screenshot({ path:"/opt/cursor/artifacts/hunter-sideways-fixed.png" });
  } else {
    const panel = g.btns.filter(b=>["u","d","l","r","up","down","left","right","ok","back","shoot","stick"].includes(b.t) || b.y>g.cv.b-2);
    ok(panel.length>0 && panel.every(b=>b.y>=g.cv.b-2), "upright controls sit under the screen");
    ok(g.cv.b < h-40, "upright screen leaves room for the panel ("+Math.round(g.cv.b)+")");
  }
  await ctx.close();
}
await browser.close();
console.log("RESULT gutter "+pass+"/"+(pass+fail));
if (bad.length) console.log(bad.join("\n"));
process.exit(fail?1:0);
