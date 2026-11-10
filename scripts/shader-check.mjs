import { build } from "esbuild";
import puppeteer from "puppeteer-core";
await build({ entryPoints: ["src/engine/layerDefs.ts"], bundle: true, format: "iife", globalName: "LD", outfile: "/tmp/ld.js" });
const fs = await import("node:fs");
const code = fs.readFileSync("/tmp/ld.js", "utf8");
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage();
await p.setContent("<canvas id=c></canvas>");
await p.addScriptTag({ content: code });
const res = await p.evaluate(() => {
  const gl = document.getElementById("c").getContext("webgl2");
  if (!gl) return { fatal: "no webgl2" };
  const V = "#version 300 es\nin vec2 a_pos;out vec2 v_uv;void main(){v_uv=a_pos*.5+.5;gl_Position=vec4(a_pos,0.,1.);}";
  const out = {};
  for (const k of LD.GPU_KINDS) {
    const s = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(s, LD.buildFragment(k)); gl.compileShader(s);
    out[k] = gl.getShaderParameter(s, gl.COMPILE_STATUS) ? "ok" : gl.getShaderInfoLog(s);
  }
  return out;
});
console.log(JSON.stringify(res, null, 1));
await b.close();
