// oklch -> sRGB and WCAG contrast
function oklchToRgb(L, C, h) {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr), b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  const toS = (c) => { c = Math.min(1, Math.max(0, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
  return [toS(r), toS(g), toS(bb)];
}
function hex(h) { h = h.replace('#',''); return [0,2,4].map(i => parseInt(h.slice(i,i+2),16)/255); }
function lum([r,g,b]) { const f = c => c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); }
function contrast(a,b){ const la=lum(a), lb=lum(b); const [hi,lo]=la>lb?[la,lb]:[lb,la]; return (hi+0.05)/(lo+0.05); }
function blend(fg, bg, alpha){ return fg.map((c,i)=>c*alpha+bg[i]*(1-alpha)); }
const toHex = (c) => '#' + c.map(v => Math.round(v*255).toString(16).padStart(2,'0')).join('');

const white = [1,1,1];
const colors = {
  primary: oklchToRgb(0.5,0.095,162),
  primaryFg: oklchToRgb(0.985,0,0),
  mutedFg: oklchToRgb(0.556,0,0),
  muted: oklchToRgb(0.97,0,0),
  foreground: oklchToRgb(0.145,0,0),
  destructive: oklchToRgb(0.577,0.245,27.325),
  ring: oklchToRgb(0.62,0.1,162),
  border: oklchToRgb(0.922,0,0),
  chart1: oklchToRgb(0.82,0.14,133),
  chart2: oklchToRgb(0.72,0.14,148),
  chart3: oklchToRgb(0.62,0.12,158),
  sidebarRing: oklchToRgb(0.708,0,0),
  brand50: hex('#f1fae9'), brand100: hex('#dff3cc'), brand200: hex('#c3e99b'), brand300: hex('#a6dc7f'),
  brand400: hex('#8fd073'), brand500: hex('#6fbe63'), brand600: hex('#4ca96b'), brand700: hex('#2e8b57'),
  brand800: hex('#1f7a5a'), brand900: hex('#145c43'), brand950: hex('#0b3326'),
  amber50: hex('#fffbeb'), amber800: hex('#92400e'), amber900: hex('#78350f'), amber600: hex('#d97706'), amber700: hex('#b45309'), amber300: hex('#fcd34d'),
  sky50: hex('#f0f9ff'), sky800: hex('#075985'), sky700: hex('#0369a1'), sky600: hex('#0284c7'),
  red600: hex('#dc2626'),
};
for (const [k,v] of Object.entries(colors)) console.log(k.padEnd(12), toHex(v));
console.log('---');
const pairs = [
  ['primary on white', colors.primary, white],
  ['primary on brand50', colors.primary, colors.brand50],
  ['primary on muted', colors.primary, colors.muted],
  ['primaryFg on primary (button text)', colors.primaryFg, colors.primary],
  ['primaryFg on primary/80 hover', colors.primaryFg, blend(colors.primary, white, 0.8)],
  ['mutedFg on white', colors.mutedFg, white],
  ['mutedFg on muted', colors.mutedFg, colors.muted],
  ['mutedFg on muted/50 (page bg)', colors.mutedFg, blend(colors.muted, white, 0.5)],
  ['mutedFg on brand50', colors.mutedFg, colors.brand50],
  ['mutedFg on amber50', colors.mutedFg, colors.amber50],
  ['fg/60 on muted (inactive tab)', blend(colors.foreground, colors.muted, 0.6), colors.muted],
  ['destructive on white', colors.destructive, white],
  ['destructive on destructive/10', colors.destructive, blend(colors.destructive, white, 0.1)],
  ['ring/50 on white (focus ring)', blend(colors.ring, white, 0.5), white],
  ['ring solid on white', colors.ring, white],
  ['ring/50 on muted/50', blend(colors.ring, blend(colors.muted, white, 0.5), 0.5), blend(colors.muted, white, 0.5)],
  ['ring/50 over primary btn edge vs white', blend(colors.ring, white, 0.5), white],
  ['border on white', colors.border, white],
  ['brand600 on white', colors.brand600, white],
  ['brand700 on white', colors.brand700, white],
  ['brand800 on white', colors.brand800, white],
  ['brand900 on brand50', colors.brand900, colors.brand50],
  ['brand900 on brand100', colors.brand900, colors.brand100],
  ['brand800 on brand50', colors.brand800, colors.brand50],
  ['brand700 on brand50', colors.brand700, colors.brand50],
  ['white on brand600', white, colors.brand600],
  ['white on brand700', white, colors.brand700],
  ['white on brand500', white, colors.brand500],
  ['amber800 on amber50', colors.amber800, colors.amber50],
  ['amber900 on amber50', colors.amber900, colors.amber50],
  ['amber800 on white', colors.amber800, white],
  ['amber600 on white', colors.amber600, white],
  ['amber700 on white', colors.amber700, white],
  ['sky800 on sky50', colors.sky800, colors.sky50],
  ['sky700 on white', colors.sky700, white],
  ['sky600 on white', colors.sky600, white],
  ['chart1 on white', colors.chart1, white],
  ['chart2 on white', colors.chart2, white],
  ['chart3 on white', colors.chart3, white],
  ['primary on white (non-text 3:1)', colors.primary, white],
  ['border vs white (input border non-text)', colors.border, white],
  ['sidebarRing on white', colors.sidebarRing, white],
];
for (const [name, a, b] of pairs) console.log(name.padEnd(42), contrast(a,b).toFixed(2));
