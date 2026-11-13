// First launch: every permission is explained before it is asked, and refusing any one of them
// leaves the app usable. Also checks Settings grows a Permissions group that reports real states.
// App build on :3111.
import puppeteer from "puppeteer-core";

const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", protocolTimeout: 600000, args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
const R = {};
const errs = [];
const s = (ms) => new Promise((r) => setTimeout(r, ms));

const open = async ({ denyCamera = false, denyMic = false } = {}) => {
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  p.on("pageerror", (e) => errs.push("PE " + e));
  p.on("console", (m) => { if (m.type() === "error") errs.push("CE " + m.text()); });
  await p.evaluateOnNewDocument((dc, dm) => {
    localStorage.clear();
    const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = (c) => {
      if (dc && c?.video) return Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
      if (dm && c?.audio) return Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
      return real(c);
    };
  }, denyCamera, denyMic);
  await p.goto("http://localhost:3111", { waitUntil: "domcontentloaded" });
  await s(4000);
  return p;
};

const text = (p) => p.evaluate(() => document.body.innerText);
const click = (p, re) => p.evaluate((x) => { const r = new RegExp(x, "i"); const el = [...document.querySelectorAll("button")].find((b) => r.test(b.textContent.trim())); el?.click(); return !!el; }, re.source);

// 1. Every ask explains itself before the system prompt, and the order is camera then microphone.
{
  const p = await open();
  R.promise = /No account/i.test(await text(p));
  await click(p, /^Continue$/);
  await s(900);
  const cam = await text(p);
  R.camExplained = /viewfinder/i.test(cam) && /not uploaded|never leave|no way to send/i.test(cam);
  R.camHasSkip = await p.evaluate(() => [...document.querySelectorAll("button")].some((b) => /not now/i.test(b.textContent)));
  await click(p, /Allow camera/);
  await s(1800);
  const mic = await text(p);
  R.micExplained = /microphone|sound in videos/i.test(mic) && /silent/i.test(mic);
  R.micHasSkip = await p.evaluate(() => [...document.querySelectorAll("button")].some((b) => /silent videos/i.test(b.textContent)));
  await click(p, /silent videos/);
  await s(1200);
  // No folder step in a browser: there is no folder to pick, so the last screen is where files go
  // only on Android. Either way the app must open.
  const last = await text(p);
  if (/Where photos go/i.test(last)) { await click(p, /gallery/); await s(1200); }
  R.reachedApp = await p.evaluate(() => !!document.querySelector("video, canvas"));
  await p.close();
}

// 2. Refusing the camera must not trap anyone: the screen says how to fix it and still lets them in.
{
  const p = await open({ denyCamera: true });
  await click(p, /^Continue$/);
  await s(800);
  await click(p, /Allow camera/);
  await s(1800);
  const t = await text(p);
  R.denyExplains = /blocked/i.test(t) && /Settings/i.test(t);
  R.denyRetry = await p.evaluate(() => [...document.querySelectorAll("button")].some((b) => /try again/i.test(b.textContent)));
  await click(p, /not now/i);
  await s(1500);
  if (/Where photos go/i.test(await text(p))) { await click(p, /gallery/); await s(1200); }
  if (/sound in videos|microphone/i.test(await text(p))) { await click(p, /silent videos/); await s(1200); }
  if (/Where photos go/i.test(await text(p))) { await click(p, /gallery/); await s(1200); }
  R.denyStillUsable = !/Let.s take your first photo/i.test(await text(p)) && await p.evaluate(() => !document.body.innerText.includes("Continue"));
  await p.close();
}

// 3. Settings reports each permission and offers a way to change it.
{
  const p = await open();
  await p.evaluateOnNewDocument(() => { localStorage.setItem("pixi:onboarded", "1"); });
  await p.evaluate(() => localStorage.setItem("pixi:onboarded", "1"));
  await p.reload({ waitUntil: "domcontentloaded" });
  await s(4500);
  // The gear lives on the Looks screen, not over the viewfinder.
  await click(p, /^Looks$/);
  await s(1000);
  const opened = await p.evaluate(() => { const el = [...document.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") || "").trim() === "Settings"); el?.click(); return !!el; });
  await s(1200);
  const t = await text(p);
  R.settingsOpened = opened;
  R.permGroup = /Permissions/i.test(t) && /Camera/i.test(t) && /Microphone/i.test(t);
  R.permStates = /(Allowed|Blocked|Not asked yet|Not checked)/.test(t);
  await p.close();
}

console.log(JSON.stringify(R, null, 1));
console.log("errors:", JSON.stringify(errs.slice(0, 5)));
await b.close();

const ok = Object.values(R).every(Boolean);
if (!ok || errs.length) process.exit(1);
console.log("onboard-check OK");
