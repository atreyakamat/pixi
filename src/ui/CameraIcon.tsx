import type { Body } from "./cameras";

// Original parametric camera illustrations (no third-party art).
export function CameraIcon({ body, color, selected }: { body: Body; color: string; selected?: boolean }) {
  const dark = "#1b1c20";
  const lens = (cx: number, cy: number, r: number) => (
    <>
      <circle cx={cx} cy={cy} r={r} fill={dark} />
      <circle cx={cx} cy={cy} r={r * 0.6} fill="#39435a" />
      <circle cx={cx - r * 0.2} cy={cy - r * 0.25} r={r * 0.18} fill="#fff" opacity=".7" />
    </>
  );
  let shape: React.ReactNode;
  switch (body) {
    case "slab":
      shape = (<><rect x="8" y="16" width="64" height="38" rx="5" fill={color} />{lens(48, 35, 14)}<rect x="14" y="21" width="12" height="5" rx="1.5" fill={dark} opacity=".6" /></>);
      break;
    case "bridge":
      shape = (<><rect x="10" y="22" width="60" height="32" rx="6" fill={color} /><rect x="26" y="14" width="18" height="10" rx="2" fill={color} />{lens(40, 38, 15)}</>);
      break;
    case "toy":
      shape = (<><rect x="12" y="18" width="56" height="36" rx="14" fill={color} />{lens(40, 36, 13)}<circle cx="58" cy="26" r="3" fill="#fff" opacity=".8" /></>);
      break;
    case "phone":
      shape = (<><rect x="26" y="6" width="28" height="60" rx="6" fill={color} /><rect x="30" y="12" width="20" height="16" rx="2" fill={dark} /><g fill={dark} opacity=".55">{[0, 1, 2].map((r) => [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={33 + c * 7} cy={38 + r * 8} r="2.3" />))}</g></>);
      break;
    case "slider":
      shape = (<><rect x="26" y="4" width="28" height="30" rx="5" fill={color} /><rect x="26" y="32" width="28" height="34" rx="5" fill={color} opacity=".85" /><rect x="30" y="9" width="20" height="14" rx="2" fill={dark} /></>);
      break;
    case "camcorder":
      shape = (<><rect x="10" y="20" width="46" height="32" rx="5" fill={color} /><rect x="54" y="26" width="16" height="20" rx="3" fill={dark} />{lens(62, 36, 7)}<rect x="18" y="12" width="20" height="8" rx="2" fill={color} /></>);
      break;
    case "instant":
      shape = (<><rect x="12" y="14" width="56" height="42" rx="6" fill={color} /><rect x="20" y="40" width="40" height="8" rx="2" fill="#f4efe6" />{lens(40, 28, 11)}</>);
      break;
    default:
      shape = (<><rect x="10" y="20" width="60" height="34" rx="7" fill={color} />{lens(34, 38, 12)}<rect x="52" y="25" width="12" height="6" rx="2" fill="#fff" opacity=".85" /></>);
  }
  return (
    <svg viewBox="0 0 80 72" className="h-full w-full" aria-hidden>
      <ellipse cx="40" cy="66" rx="30" ry="3" fill="#000" opacity=".18" />
      {shape}
      {selected && <rect x="2" y="2" width="76" height="68" rx="10" fill="none" stroke="#ff7a1a" strokeWidth="2.5" />}
    </svg>
  );
}
