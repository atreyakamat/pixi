// Renders every look on the same scene into a contact sheet so near-duplicates are easy to spot.
import { build } from "esbuild";
import puppeteer from "puppeteer-core";
import fs from "node:fs";
await build({ entryPoints: ["scripts/lr-entry.ts"], bundle: true, format: "iife", outfile: "/tmp/lr.js", alias: { "@": "./src" }, logLevel: "error" });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await p.setContent("<body style='margin:0;background:#111'><canvas id=out></canvas></body>");
await p.addScriptTag({ content: fs.readFileSync("/tmp/lr.js", "utf8") });
await p.waitForFunction("window.__done === true || window.__err", { timeout: 240000 });
const err = await p.evaluate("window.__err || null");
const url = await p.evaluate("document.getElementById('out').toDataURL('image/jpeg',0.85)");
fs.writeFileSync("/tmp/lr.jpg", Buffer.from(url.split(",")[1], "base64"));
console.log("looks", n, "err", err, "pageerrors", JSON.stringify(errs.slice(0, 5)));
await b.close();
