import type { Decor, Slot, StripTemplate } from "./strips";

const W = 600, H = 1800;

/** Evenly stacked photo windows between a header and a footer. */
const stack = (n: number, top: number, bottom: number, m = 40, gap = 12, r = 0): Slot[] => {
  const h = (H - top - bottom - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({ x: m, y: Math.round(top + i * (h + gap)), w: W - m * 2, h: Math.round(h), r }));
};

/** A thin keyline around every photo, so the windows read as frames rather than pasted images. */
const frames = (slots: Slot[], color: string, lw = 3, pad = 0): Decor[] =>
  slots.map((s) => ({ k: "rect", x: s.x - pad, y: s.y - pad, w: s.w + pad * 2, h: s.h + pad * 2, r: s.r, stroke: color, lw }));

const f = (key: string, label: string, def: string, max = 24) => ({ key, label, def, max });

/* ---------------------------------------------------------------- */

const theaterSlots = stack(4, 212, 170);
const theater: StripTemplate = {
  id: "st-theater", name: "Theatre Ticket", family: "Ticket",
  blurb: "Deep red house ticket with a torn edge, a seat number and a star rating.",
  w: W, h: H, bg: "#7B1220", cut: "#ffffff",
  slots: theaterSlots,
  fields: [f("title", "Show title", "Theatre Show", 22), f("row", "Row", "B2", 4), f("seat", "Seat", "02", 4), f("footer", "Footer", "Save the best moment", 28)],
  under: [
    { k: "rect", x: 10, y: 10, w: W - 20, h: H - 20, r: 10, stroke: "#F0E2C4", lw: 3 },
    { k: "rect", x: 32, y: 36, w: W - 64, h: 150, r: 6, fill: "#F6EEDC" },
    { k: "text", x: W / 2, y: 92, t: "{title}", size: 42, color: "#7B1220", font: "serif", italic: true, align: "center" },
    { k: "line", x1: 60, y1: 112, x2: W - 60, y2: 112, color: "#7B1220", lw: 1.5 },
    { k: "text", x: 70, y: 140, t: "Row", size: 17, color: "#9A6B4F", font: "serif" },
    { k: "text", x: 70, y: 170, t: "{row}", size: 27, color: "#2B1A17", font: "serif", weight: "700" },
    { k: "text", x: 215, y: 140, t: "Seat", size: 17, color: "#9A6B4F", font: "serif" },
    { k: "text", x: 215, y: 170, t: "{seat}", size: 27, color: "#2B1A17", font: "serif", weight: "700" },
    { k: "text", x: W - 70, y: 140, t: "Date", size: 17, color: "#9A6B4F", font: "serif", align: "right" },
    { k: "text", x: W - 70, y: 170, t: "{date}", size: 22, color: "#2B1A17", font: "serif", weight: "700", align: "right" },
    ...frames(theaterSlots, "#F0E2C4", 3, 5),
  ],
  over: [
    { k: "stars", x: W / 2, y: 1668, n: 5, size: 13, gap: 12, color: "#F0E2C4", align: "center" },
    { k: "text", x: W / 2, y: 1718, t: "{footer}", size: 21, color: "#F6EEDC", font: "serif", align: "center", caps: true, track: 3 },
    { k: "line", x1: 150, y1: 1740, x2: W - 150, y2: 1740, color: "#C9A46A", lw: 1 },
    { k: "text", x: W / 2, y: 1772, t: "ADMIT ONE", size: 16, color: "#C9A46A", font: "sans", align: "center", track: 6 },
    { k: "perf", side: "both", r: 7, gap: 28, color: "#ffffff" },
  ],
};

const marqueeSlots = stack(3, 206, 216, 36, 14);
const marquee: StripTemplate = {
  id: "st-marquee", name: "Movie Ticket", family: "Ticket",
  blurb: "Navy cinema stub with a bold title bar, show times and a barcode.",
  w: W, h: H, bg: "#0E2C63", cut: "#ffffff",
  slots: marqueeSlots,
  fields: [f("title", "Title", "Movie Tickets", 20), f("sub", "Sub-line", "Admit one · Screen 01", 28), f("footer", "Footer", "Now Showing", 20)],
  under: [
    { k: "rect", x: 14, y: 14, w: W - 28, h: H - 28, r: 8, stroke: "#E8EDF7", lw: 2.5 },
    { k: "rect", x: 36, y: 40, w: W - 72, h: 92, r: 4, fill: "#E8EDF7" },
    { k: "text", x: W / 2, y: 104, t: "{title}", size: 44, color: "#0E2C63", font: "sans", weight: "800", align: "center", caps: true, track: 1 },
    { k: "text", x: W / 2, y: 166, t: "{sub}", size: 20, color: "#A9BEE4", font: "mono", align: "center", caps: true, track: 2 },
    ...frames(marqueeSlots, "#E8EDF7", 3, 5),
  ],
  over: [
    { k: "line", x1: 36, y1: 1612, x2: W - 36, y2: 1612, color: "#4C6DA8", lw: 1, dash: [8, 8] },
    { k: "text", x: 44, y: 1660, t: "{date}", size: 22, color: "#E8EDF7", font: "mono" },
    { k: "text", x: W - 44, y: 1660, t: "{time}", size: 22, color: "#E8EDF7", font: "mono", align: "right" },
    { k: "text", x: W / 2, y: 1706, t: "{footer}", size: 24, color: "#F2C14E", font: "sans", weight: "700", align: "center", caps: true, track: 5 },
    { k: "barcode", x: 150, y: 1726, w: 300, h: 42, color: "#E8EDF7", seed: 21 },
    { k: "notch", y: 196, r: 16, color: "#ffffff" },
  ],
};

const boardingSlots = stack(4, 228, 198, 44, 12, 4);
const boarding: StripTemplate = {
  id: "st-boarding", name: "Boarding Pass", family: "Ticket",
  blurb: "Airline stub in cream and red, with a route, a seat and a barcode tail.",
  w: W, h: H, bg: "#F6F2E9", cut: "#ffffff",
  slots: boardingSlots,
  fields: [f("from", "From", "GOA", 4), f("to", "To", "LAX", 4), f("title", "Airline", "Pixi Air", 16), f("seat", "Seat", "14A", 5)],
  under: [
    { k: "rect", x: 0, y: 0, w: W, h: 16, fill: "#C9282D" },
    { k: "text", x: 44, y: 76, t: "{title}", size: 28, color: "#C9282D", font: "sans", weight: "800", caps: true, track: 2 },
    { k: "text", x: W - 44, y: 76, t: "Boarding Pass", size: 16, color: "#8A8275", font: "mono", align: "right", caps: true, track: 2 },
    { k: "line", x1: 44, y1: 96, x2: W - 44, y2: 96, color: "#C8C0B0", lw: 1 },
    { k: "text", x: 44, y: 134, t: "From", size: 14, color: "#8A8275", font: "mono", caps: true, track: 2 },
    { k: "text", x: 44, y: 182, t: "{from}", size: 46, color: "#1D1B17", font: "sans", weight: "800" },
    { k: "text", x: W / 2, y: 170, t: "✈", size: 34, color: "#C9282D", align: "center" },
    { k: "text", x: W - 44, y: 134, t: "To", size: 14, color: "#8A8275", font: "mono", align: "right", caps: true, track: 2 },
    { k: "text", x: W - 44, y: 182, t: "{to}", size: 46, color: "#1D1B17", font: "sans", weight: "800", align: "right" },
    ...frames(boardingSlots, "#1D1B17", 2, 4),
  ],
  over: [
    { k: "line", x1: 0, y1: 1620, x2: W, y2: 1620, color: "#C8C0B0", lw: 2, dash: [10, 8] },
    { k: "text", x: 44, y: 1664, t: "Seat", size: 14, color: "#8A8275", font: "mono", caps: true, track: 2 },
    { k: "text", x: 44, y: 1700, t: "{seat}", size: 30, color: "#1D1B17", font: "sans", weight: "800" },
    { k: "text", x: W - 44, y: 1664, t: "Date", size: 14, color: "#8A8275", font: "mono", align: "right", caps: true, track: 2 },
    { k: "text", x: W - 44, y: 1700, t: "{date}", size: 22, color: "#1D1B17", font: "mono", align: "right" },
    { k: "barcode", x: 44, y: 1726, w: W - 88, h: 44, color: "#1D1B17", seed: 5 },
    { k: "perf", side: "both", r: 6, gap: 24, color: "#ffffff", from: 1620 },
  ],
};

const newsSlots = stack(4, 232, 150, 36, 14);
const newsprint: StripTemplate = {
  id: "st-newsprint", name: "Front Page", family: "Paper",
  blurb: "Newspaper front page with a masthead, column rules and a dateline.",
  w: W, h: H, bg: "#EDE7D7", cut: "#ffffff",
  slots: newsSlots,
  fields: [f("title", "Masthead", "The Story Today", 22), f("sub", "Headline", "A good evening, recorded", 34), f("footer", "Byline", "Photographed by us", 26)],
  under: [
    { k: "line", x1: 36, y1: 60, x2: W - 36, y2: 60, color: "#231F1A", lw: 4 },
    { k: "text", x: W / 2, y: 126, t: "{title}", size: 46, color: "#231F1A", font: "serif", weight: "700", align: "center" },
    { k: "line", x1: 36, y1: 148, x2: W - 36, y2: 148, color: "#231F1A", lw: 1.5 },
    { k: "text", x: 40, y: 172, t: "VOL. I", size: 14, color: "#5C564C", font: "serif", track: 2 },
    { k: "text", x: W / 2, y: 172, t: "{date}", size: 14, color: "#5C564C", font: "serif", align: "center", track: 2 },
    { k: "text", x: W - 40, y: 172, t: "PRICE: A SMILE", size: 14, color: "#5C564C", font: "serif", align: "right", track: 2 },
    { k: "line", x1: 36, y1: 186, x2: W - 36, y2: 186, color: "#231F1A", lw: 1.5 },
    { k: "text", x: W / 2, y: 218, t: "{sub}", size: 24, color: "#231F1A", font: "serif", italic: true, align: "center" },
    ...frames(newsSlots, "#231F1A", 2),
  ],
  over: [
    { k: "line", x1: 36, y1: 1676, x2: W - 36, y2: 1676, color: "#231F1A", lw: 1.5 },
    { k: "text", x: W / 2, y: 1716, t: "{footer}", size: 19, color: "#231F1A", font: "serif", align: "center", caps: true, track: 3 },
    { k: "text", x: W / 2, y: 1750, t: "continued inside", size: 15, color: "#5C564C", font: "serif", italic: true, align: "center" },
  ],
};

const classicSlots = stack(4, 42, 128, 28, 10);
const classic: StripTemplate = {
  id: "st-classic", name: "Classic Booth", family: "Booth",
  blurb: "The plain white strip a mall photobooth prints. Nothing but the photos.",
  w: W, h: H, bg: "#FFFFFF", cut: "#E9E6E0",
  slots: classicSlots,
  fields: [f("footer", "Footer", "Pixi", 18)],
  under: [],
  over: [
    { k: "text", x: W / 2, y: 1718, t: "{footer}", size: 24, color: "#1A1A1A", font: "mono", align: "center", caps: true, track: 8 },
    { k: "text", x: W / 2, y: 1754, t: "{date}", size: 16, color: "#8A8A8A", font: "mono", align: "center", track: 3 },
  ],
};

const slateSlots = stack(3, 268, 180, 40, 14);
const slate: StripTemplate = {
  id: "st-slate", name: "Clapperboard", family: "Film",
  blurb: "Film slate in black and white, with scene and take numbers.",
  w: W, h: H, bg: "#111113", cut: "#ffffff",
  slots: slateSlots,
  fields: [f("title", "Production", "Our Feature", 20), f("scene", "Scene", "01", 4), f("take", "Take", "03", 4)],
  under: [
    { k: "checker", x: 0, y: 0, w: W, h: 56, cell: 50, a: "#F2F2F2", b: "#111113" },
    { k: "text", x: W / 2, y: 128, t: "{title}", size: 40, color: "#F2F2F2", font: "sans", weight: "800", align: "center", caps: true, track: 2 },
    { k: "line", x1: 60, y1: 152, x2: W - 60, y2: 152, color: "#4A4A50", lw: 1 },
    { k: "text", x: 60, y: 186, t: "SCENE", size: 14, color: "#8A8A92", font: "mono", track: 3 },
    { k: "text", x: 60, y: 228, t: "{scene}", size: 34, color: "#F2F2F2", font: "mono", weight: "700" },
    { k: "text", x: W / 2, y: 186, t: "TAKE", size: 14, color: "#8A8A92", font: "mono", align: "center", track: 3 },
    { k: "text", x: W / 2, y: 228, t: "{take}", size: 34, color: "#F2F2F2", font: "mono", weight: "700", align: "center" },
    { k: "text", x: W - 60, y: 186, t: "DATE", size: 14, color: "#8A8A92", font: "mono", align: "right", track: 3 },
    { k: "text", x: W - 60, y: 228, t: "{date}", size: 22, color: "#F2F2F2", font: "mono", align: "right" },
    ...frames(slateSlots, "#F2F2F2", 3, 5),
  ],
  over: [
    { k: "stars", x: W / 2, y: 1674, n: 3, size: 15, gap: 18, color: "#F2C14E", align: "center" },
    { k: "checker", x: 0, y: H - 56, w: W, h: 56, cell: 50, a: "#111113", b: "#F2F2F2" },
  ],
};

const laceSlots = stack(4, 180, 170, 56, 12);
const lace: StripTemplate = {
  id: "st-lace", name: "Lace Keepsake", family: "Vintage",
  blurb: "Navy keepsake with a scalloped cream edge and a serif dedication.",
  w: W, h: H, bg: "#16233F", cut: "#ffffff",
  slots: laceSlots,
  fields: [f("title", "Title", "Keepsake", 20), f("footer", "Dedication", "With love, always", 28)],
  under: [
    { k: "scallop", side: "left", r: 15, color: "#F4EFE4" },
    { k: "scallop", side: "right", r: 15, color: "#F4EFE4" },
    { k: "text", x: W / 2, y: 92, t: "{title}", size: 42, color: "#F4EFE4", font: "serif", italic: true, align: "center" },
    { k: "line", x1: 180, y1: 118, x2: W - 180, y2: 118, color: "#C2A878", lw: 1 },
    { k: "text", x: W / 2, y: 150, t: "{date}", size: 17, color: "#C2A878", font: "serif", align: "center", track: 4 },
    ...frames(laceSlots, "#F4EFE4", 2, 6),
  ],
  over: [
    { k: "text", x: W / 2, y: 1700, t: "{footer}", size: 25, color: "#F4EFE4", font: "serif", italic: true, align: "center" },
    { k: "line", x1: 220, y1: 1726, x2: W - 220, y2: 1726, color: "#C2A878", lw: 1 },
  ],
};

const minimalSlots = stack(4, 136, 142, 44, 14, 6);
const minimal: StripTemplate = {
  id: "st-minimal", name: "Raw Memories", family: "Modern",
  blurb: "White, quiet and typographic. Lets the photographs do the talking.",
  w: W, h: H, bg: "#FFFFFF", cut: "#E9E6E0",
  slots: minimalSlots,
  fields: [f("title", "Title", "Raw Memories", 22), f("footer", "Footer", "", 26)],
  under: [
    { k: "text", x: 44, y: 76, t: "{title}", size: 26, color: "#111111", font: "sans", weight: "600" },
    { k: "text", x: W - 44, y: 76, t: "{date}", size: 16, color: "#9A9A9A", font: "mono", align: "right" },
    { k: "line", x1: 44, y1: 100, x2: W - 44, y2: 100, color: "#E2E2E2", lw: 1.5 },
  ],
  over: [
    { k: "line", x1: 44, y1: 1700, x2: W - 44, y2: 1700, color: "#E2E2E2", lw: 1.5 },
    { k: "text", x: 44, y: 1740, t: "{footer}", size: 16, color: "#6A6A6A", font: "sans" },
    { k: "text", x: W - 44, y: 1740, t: "PIXI", size: 16, color: "#111111", font: "sans", weight: "700", align: "right", track: 5 },
  ],
};

/* --- cards, not strips --- */

const CW = 620, CH = 760;
const gridSlots: Slot[] = [
  { x: 24, y: 24, w: 280, h: 280, r: 4 }, { x: 316, y: 24, w: 280, h: 280, r: 4 },
  { x: 24, y: 316, w: 280, h: 280, r: 4 }, { x: 316, y: 316, w: 280, h: 280, r: 4 },
];
const card: StripTemplate = {
  id: "st-grid", name: "Four Square", family: "Card",
  blurb: "Four photos in a square card, easy to post as one picture.",
  w: CW, h: CH, bg: "#F4EFE6", cut: "#ffffff",
  slots: gridSlots,
  fields: [f("title", "Title", "Four Square", 22), f("footer", "Footer", "", 28)],
  under: frames(gridSlots, "#D8CEBE", 2, 3),
  over: [
    { k: "line", x1: 24, y1: 628, x2: CW - 24, y2: 628, color: "#D8CEBE", lw: 1.5 },
    { k: "text", x: 24, y: 672, t: "{title}", size: 28, color: "#1F1B16", font: "serif", weight: "700" },
    { k: "text", x: 24, y: 706, t: "{footer}", size: 17, color: "#7C7366", font: "sans" },
    { k: "text", x: CW - 24, y: 706, t: "{date}", size: 17, color: "#7C7366", font: "mono", align: "right" },
  ],
};

const PW = 600, PH = 730;
const polaroid: StripTemplate = {
  id: "st-polaroid", name: "Instant Print", family: "Card",
  blurb: "One photo on a thick white card, with room to write underneath.",
  w: PW, h: PH, bg: "#FCFBF7", cut: "#E9E6E0",
  slots: [{ x: 38, y: 38, w: PW - 76, h: 524, r: 2 }],
  fields: [f("footer", "Caption", "A good day", 30)],
  under: [{ k: "rect", x: 38, y: 38, w: PW - 76, h: 524, r: 2, stroke: "#E4DED2", lw: 2 }],
  over: [
    { k: "text", x: PW / 2, y: 638, t: "{footer}", size: 32, color: "#1F1B16", font: "serif", italic: true, align: "center" },
    { k: "text", x: PW / 2, y: 682, t: "{date}", size: 16, color: "#9A9387", font: "mono", align: "center", track: 3 },
  ],
};

const filmstrip: StripTemplate = {
  id: "st-film", name: "35mm Negative", family: "Film",
  blurb: "A length of film with sprocket holes and frame numbers down the edge.",
  w: W, h: H, bg: "#1A1714", cut: "#ffffff",
  slots: stack(4, 70, 70, 74, 18, 2),
  fields: [f("title", "Roll name", "PIXI 400", 14)],
  under: [
    { k: "sprocket", side: "both", color: "#D8CDBA", w: 18, h: 24, gap: 22 },
    ...frames(stack(4, 70, 70, 74, 18, 2), "#4A423A", 2, 4),
  ],
  over: [
    { k: "text", x: W / 2, y: 44, t: "{title}", size: 20, color: "#E6A23C", font: "mono", align: "center", track: 6 },
    { k: "text", x: W / 2, y: H - 28, t: "{date}", size: 17, color: "#E6A23C", font: "mono", align: "center", track: 4 },
  ],
};

export const STRIP_TEMPLATES: StripTemplate[] = [classic, theater, marquee, boarding, newsprint, slate, lace, minimal, filmstrip, card, polaroid];

export const stripById = (id: string) => STRIP_TEMPLATES.find((t) => t.id === id) ?? STRIP_TEMPLATES[0];
