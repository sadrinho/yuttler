// route colors come from the shuttle api as hex without the #, and they're arbitrary.
// light theme uses them as-is; dark theme lightens them so they still show up on the dark map tiles.
// one consistent transform (not a lookup table): hex -> OKLCH, lightness + 0.07, -> hex.
// 0.07 is measured from the design's own examples (red E0472C -> F2603F is +0.060, green 2F9E5F -> 3CB873 is +0.076).
// done in js rather than css relative colors because leaflet writes stroke as an svg attribute, where those aren't reliable

const DARK_LIGHTEN = 0.07
const MAX_L = 0.9 // don't push already-light colors (the gold route) toward white; they're visible on dark tiles as they are
const MIN_L = 0.5 // near-black routes (weekend grocery is 000000) would vanish on dark tiles otherwise
const cache = new Map()

export function routeColor(apiHex, dark) {
  const hex = `#${apiHex || '888888'}` // missing color: neutral gray, same fallback Map.jsx always used
  if (!dark) return hex
  if (!cache.has(hex)) cache.set(hex, lighten(hex, DARK_LIGHTEN))
  return cache.get(hex)
}

// ---- color math (OKLab, which is OKLCH before the polar step; changing L is the same in both) ----

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

function hexToOklab(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = toLinear(((n >> 16) & 255) / 255)
  const g = toLinear(((n >> 8) & 255) / 255)
  const b = toLinear((n & 255) / 255)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function oklabToLinearRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

const inGamut = (rgb) => rgb.every((c) => c >= -0.0001 && c <= 1.0001)

function lighten(hex, amount) {
  const [L, a, b] = hexToOklab(hex)
  const newL = Math.max(MIN_L, Math.min(L + amount, Math.max(L, MAX_L)))
  // very light colors (e.g. the gold route) can't get lighter at full saturation, so ease the chroma
  // down just enough to stay a real color instead of clipping to something off-hue
  let rgb = oklabToLinearRgb([newL, a, b])
  if (!inGamut(rgb)) {
    let lo = 0 // chroma scale known to fit (0 = gray always fits)
    let hi = 1 // chroma scale known not to fit
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2
      if (inGamut(oklabToLinearRgb([newL, a * mid, b * mid]))) lo = mid
      else hi = mid
    }
    rgb = oklabToLinearRgb([newL, a * lo, b * lo])
  }
  return (
    '#' +
    rgb
      .map((c) => Math.round(Math.min(1, Math.max(0, toSrgb(Math.min(1, Math.max(0, c))))) * 255).toString(16).padStart(2, '0'))
      .join('')
  )
}
