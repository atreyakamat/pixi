/**
 * Drawn stand-in scenes. They give the landing page's live demo and the launch kit something to
 * put through the real look engine without shipping anyone's photographs.
 */
const rnd = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

function canvas(w: number, h: number) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  return [c, c.getContext("2d")!] as const;
}

export function beach(w = 1200, h = 1500) {
  const [c, g] = canvas(w, h); const r = rnd(7);
  const sky = g.createLinearGradient(0, 0, 0, h * 0.62);
  sky.addColorStop(0, "#2b3a67"); sky.addColorStop(0.45, "#c4627a"); sky.addColorStop(0.8, "#f6a25a"); sky.addColorStop(1, "#ffd59a");
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const sun = g.createRadialGradient(w * 0.6, h * 0.58, 10, w * 0.6, h * 0.58, 260);
  sun.addColorStop(0, "#fff4d6"); sun.addColorStop(0.25, "#ffd38a"); sun.addColorStop(1, "rgba(255,180,100,0)");
  g.fillStyle = sun; g.fillRect(0, 0, w, h);
  const sea = g.createLinearGradient(0, h * 0.62, 0, h * 0.8);
  sea.addColorStop(0, "#d9805e"); sea.addColorStop(1, "#3a3a5c");
  g.fillStyle = sea; g.fillRect(0, h * 0.62, w, h * 0.2);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,220,170,${0.15 + r() * 0.35})`; g.fillRect(w * 0.6 - 160 + r() * 320, h * 0.63 + r() * h * 0.15, 30 + r() * 90, 3); }
  const sand = g.createLinearGradient(0, h * 0.8, 0, h);
  sand.addColorStop(0, "#5a3f3a"); sand.addColorStop(1, "#24191b");
  g.fillStyle = sand; g.fillRect(0, h * 0.8, w, h * 0.2);
  // palms
  g.strokeStyle = "#140d10"; g.fillStyle = "#140d10";
  const palm = (x: number, y: number, s: number, lean: number) => {
    g.lineWidth = 18 * s; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.4, y - 300 * s, x + lean, y - 560 * s); g.stroke();
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * 0.48;
      g.lineWidth = 9 * s; g.beginPath(); g.moveTo(x + lean, y - 560 * s);
      g.quadraticCurveTo(x + lean + Math.cos(a) * 160 * s, y - 560 * s + Math.sin(a) * 70 * s - 40 * s, x + lean + Math.cos(a) * 260 * s, y - 560 * s + 90 * s + Math.abs(k - 3) * 25 * s);
      g.stroke();
    }
  };
  palm(w * 0.12, h * 0.86, 1.1, 120); palm(w * 0.24, h * 0.88, 0.8, 60); palm(w * 0.92, h * 0.9, 0.95, -150);
  // two people walking
  g.fillStyle = "#120c0e";
  for (const [x, s] of [[w * 0.48, 1], [w * 0.53, 0.92]] as const) {
    g.beginPath(); g.arc(x, h * 0.73, 16 * s, 0, 7); g.fill();
    g.fillRect(x - 13 * s, h * 0.745, 26 * s, 70 * s); g.fillRect(x - 11 * s, h * 0.81, 9 * s, 50 * s); g.fillRect(x + 2 * s, h * 0.81, 9 * s, 50 * s);
  }
  return c;
}

export function neon(w = 1200, h = 1500) {
  const [c, g] = canvas(w, h); const r = rnd(11);
  g.fillStyle = "#0b0a14"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) { const x = i * w / 8 - 40; g.fillStyle = ["#15131f", "#1b1828", "#121019"][i % 3]; g.fillRect(x, h * 0.1 + (i % 3) * 60, w / 8 + 20, h); }
  for (let i = 0; i < 300; i++) { g.fillStyle = r() > 0.6 ? "#ffcf7a" : "#2a2440"; g.fillRect(r() * w, h * 0.15 + r() * h * 0.45, 10, 14); }
  const glow = (x: number, y: number, rr: number, col: string) => { const gr = g.createRadialGradient(x, y, 2, x, y, rr); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); };
  glow(w * 0.3, h * 0.42, 240, "rgba(255,40,140,.55)"); glow(w * 0.75, h * 0.5, 260, "rgba(40,200,255,.45)");
  g.fillStyle = "#ff3d9a"; g.fillRect(w * 0.16, h * 0.4, w * 0.28, 22); g.fillRect(w * 0.16, h * 0.44, w * 0.18, 18);
  g.fillStyle = "#4fe3ff"; g.fillRect(w * 0.62, h * 0.47, w * 0.26, 20);
  g.font = `bold ${Math.round(w * 0.07)}px sans-serif`; g.fillStyle = "#ffe36b"; g.fillText("OPEN", w * 0.64, h * 0.43);
  const wet = g.createLinearGradient(0, h * 0.62, 0, h); wet.addColorStop(0, "#1c1626"); wet.addColorStop(1, "#07060b");
  g.fillStyle = wet; g.fillRect(0, h * 0.62, w, h);
  for (let i = 0; i < 160; i++) { g.fillStyle = ["rgba(255,61,154,.35)", "rgba(79,227,255,.3)", "rgba(255,207,122,.3)"][i % 3]; g.fillRect(w * 0.1 + r() * w * 0.8, h * 0.64 + r() * h * 0.34, 4 + r() * 40, 2); }
  for (let i = 0; i < 40; i++) glow(r() * w, h * 0.66 + r() * h * 0.3, 20 + r() * 50, `rgba(${r() > 0.5 ? "255,90,170" : "90,220,255"},.25)`);
  g.fillStyle = "#050409"; g.beginPath(); g.ellipse(w * 0.5, h * 0.98, 120, 380, 0, 0, 7); g.fill();
  g.beginPath(); g.arc(w * 0.5, h * 0.66, 48, 0, 7); g.fill();
  return c;
}

export function cafe(w = 1200, h = 1500) {
  const [c, g] = canvas(w, h); const r = rnd(3);
  const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, "#e9d9c2"); bg.addColorStop(1, "#b98f6b");
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const win = g.createLinearGradient(0, 0, 0, h * 0.5); win.addColorStop(0, "#fff8e8"); win.addColorStop(1, "#f3dcb6");
  g.fillStyle = win; g.fillRect(w * 0.08, h * 0.04, w * 0.84, h * 0.44);
  g.fillStyle = "#5c7a4a"; for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(w * 0.1 + r() * w * 0.8, h * 0.4 + r() * h * 0.08, 30 + r() * 50, 14 + r() * 20, r() * 3, 0, 7); g.fill(); }
  g.fillStyle = "#7a4b2c"; g.fillRect(0, h * 0.55, w, h * 0.45);
  for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(60,30,15,${0.15 + r() * 0.2})`; g.fillRect(0, h * 0.56 + i * 38, w, 3); }
  g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(w * 0.52, h * 0.79, 290, 70, 0, 0, 7); g.fill();
  g.fillStyle = "#f7f3ec"; g.beginPath(); g.ellipse(w * 0.5, h * 0.74, 280, 80, 0, 0, 7); g.fill();
  g.fillStyle = "#efe7db"; g.fillRect(w * 0.5 - 150, h * 0.55, 300, h * 0.18); g.beginPath(); g.ellipse(w * 0.5, h * 0.73, 150, 34, 0, 0, 7); g.fill();
  g.fillStyle = "#f7f3ec"; g.beginPath(); g.ellipse(w * 0.5, h * 0.55, 150, 36, 0, 0, 7); g.fill();
  g.fillStyle = "#6b3d1f"; g.beginPath(); g.ellipse(w * 0.5, h * 0.555, 128, 28, 0, 0, 7); g.fill();
  g.strokeStyle = "#f2e2c8"; g.lineWidth = 6; g.beginPath(); g.moveTo(w * 0.47, h * 0.555); g.bezierCurveTo(w * 0.5, h * 0.535, w * 0.53, h * 0.575, w * 0.5, h * 0.56); g.bezierCurveTo(w * 0.47, h * 0.545, w * 0.52, h * 0.53, w * 0.53, h * 0.55); g.stroke();
  g.strokeStyle = "#efe7db"; g.lineWidth = 26; g.beginPath(); g.arc(w * 0.5 + 170, h * 0.63, 60, -1.2, 1.2); g.stroke();
  g.fillStyle = "#e5b65a"; g.save(); g.translate(w * 0.2, h * 0.86); g.rotate(-0.2); g.beginPath(); g.ellipse(0, 0, 130, 60, 0, 0, 7); g.fill(); g.restore();
  return c;
}

export function portrait(w = 1200, h = 1500) {
  const [c, g] = canvas(w, h); const r = rnd(5);
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#9ac7d9"); bg.addColorStop(1, "#f3d1b0");
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * h * 0.7, rr = 20 + r() * 90; const gr = g.createRadialGradient(x, y, 1, x, y, rr); gr.addColorStop(0, "rgba(255,250,230,.55)"); gr.addColorStop(1, "rgba(255,250,230,0)"); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  g.fillStyle = "#e8d06a"; g.beginPath(); g.ellipse(w * 0.5, h * 1.02, 420, 360, 0, 0, 7); g.fill();
  g.fillStyle = "#c98f6e"; g.fillRect(w * 0.5 - 70, h * 0.6, 140, 140);
  g.fillStyle = "#d9a07e"; g.beginPath(); g.ellipse(w * 0.5, h * 0.48, 190, 240, 0, 0, 7); g.fill();
  g.fillStyle = "#2a1712"; g.beginPath(); g.ellipse(w * 0.5, h * 0.38, 230, 190, 0, Math.PI * 1.02, Math.PI * 1.98); g.fill();
  g.beginPath(); g.ellipse(w * 0.31, h * 0.56, 70, 260, 0.05, 0, 7); g.ellipse(w * 0.69, h * 0.56, 70, 260, -0.05, 0, 7); g.fill();
  g.fillStyle = "#241510"; g.beginPath(); g.ellipse(w * 0.43, h * 0.47, 22, 12, 0, 0, 7); g.ellipse(w * 0.57, h * 0.47, 22, 12, 0, 0, 7); g.fill();
  g.strokeStyle = "#9a4a3a"; g.lineWidth = 10; g.lineCap = "round"; g.beginPath(); g.arc(w * 0.5, h * 0.53, 60, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
  g.fillStyle = "rgba(230,120,110,.35)"; g.beginPath(); g.arc(w * 0.39, h * 0.53, 34, 0, 7); g.arc(w * 0.61, h * 0.53, 34, 0, 7); g.fill();
  return c;
}

export function concert(w = 1200, h = 1500) {
  const [c, g] = canvas(w, h); const r = rnd(19);
  g.fillStyle = "#0a0612"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) {
    const x = w * (0.1 + i * 0.16); const col = ["255,70,160", "120,90,255", "255,190,60"][i % 3];
    const gr = g.createLinearGradient(x, 0, w * 0.5, h * 0.7); gr.addColorStop(0, `rgba(${col},.6)`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - 20, 0); g.lineTo(x + 20, 0); g.lineTo(w * 0.5 + (i - 2.5) * 140, h * 0.75); g.lineTo(w * 0.5 + (i - 2.5) * 80, h * 0.75); g.fill();
  }
  for (let i = 0; i < 60; i++) { const x = r() * w, y = r() * h * 0.6, rr = 6 + r() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, "rgba(255,255,255,.7)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  g.fillStyle = "#050308";
  for (let i = 0; i < 14; i++) { const x = i * w / 13; g.beginPath(); g.arc(x, h * 0.83 - (i % 3) * 18, 50, 0, 7); g.fill(); g.fillRect(x - 60, h * 0.83 - (i % 3) * 18, 120, h); }
  for (let i = 0; i < 5; i++) { const x = w * (0.15 + i * 0.18); g.save(); g.translate(x, h * 0.78); g.rotate(-0.3 + i * 0.15); g.fillRect(-10, -200, 20, 200); g.beginPath(); g.arc(0, -210, 22, 0, 7); g.fill(); g.restore(); }
  return c;
}

export function hills(w = 1200, h = 1500) {
  const [c, g] = canvas(w, h);
  const sky = g.createLinearGradient(0, 0, 0, h * 0.6); sky.addColorStop(0, "#f5c9a0"); sky.addColorStop(0.6, "#f7e1b8"); sky.addColorStop(1, "#d8e6d4");
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.fillStyle = "#fff5dc"; g.beginPath(); g.arc(w * 0.3, h * 0.32, 70, 0, 7); g.fill();
  const layer = (y: number, amp: number, col: string, seed: number) => { const r = rnd(seed); g.fillStyle = col; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 20) g.lineTo(x, y + Math.sin(x / 140 + seed) * amp + r() * 10); g.lineTo(w, h); g.fill(); };
  layer(h * 0.5, 40, "#a9b9a6", 1); layer(h * 0.58, 50, "#7f9a7c", 2); layer(h * 0.67, 60, "#557553", 3); layer(h * 0.77, 50, "#35523a", 4); layer(h * 0.88, 30, "#1f3426", 5);
  g.fillStyle = "rgba(255,250,235,.35)"; g.fillRect(0, h * 0.52, w, 30);
  return c;
}

export const SCENES = [beach, neon, cafe, portrait, concert, hills];
