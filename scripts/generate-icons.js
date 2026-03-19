// Run: node scripts/generate-icons.js
// Requires: npm install canvas (dev dependency)

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// ── Cinis hexagon mark ────────────────────────────────────────────────────────
// Source SVG viewBox: 0 0 64 64
// Polygons drawn in order (bottom to top visually)

const MARK_LAYERS = [
  { points: '32,2 56,15 56,43 32,56 8,43 8,15',       fill: '#FF6644', opacity: 0.45, stroke: true },
  { points: '32,4 54,16 54,42 32,54 10,42 10,16',     fill: '#FF6644', opacity: 1 },
  { points: '32,7 51,18 51,40 32,52 13,40 13,18',     fill: '#120704', opacity: 1 },
  { points: '32,14 46,22 46,40 32,48 18,40 18,22',    fill: '#5A1005', opacity: 1 },
  { points: '32,20 42,26 42,40 32,45 22,40 22,26',    fill: '#A82010', opacity: 1 },
  { points: '32,26 38,29 38,40 32,43 26,40 26,29',    fill: '#E8321A', opacity: 1 },
  { points: '32,29 45,40 40,43 32,47 24,43 19,40',    fill: '#FF6644', opacity: 0.92 },
  { points: '32,33 41,40 38,42 32,45 26,42 23,40',    fill: '#FFD0C0', opacity: 0.76 },
  { points: '32,36 37,40 36,41 32,43 28,41 27,40',    fill: '#FFF0EB', opacity: 0.60 },
]

function parsePoly(str) {
  return str.trim().split(/\s+/).map(pair => {
    const [x, y] = pair.split(',').map(Number)
    return { x, y }
  })
}

function hexToRgba(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

function drawMark(ctx, tileSize) {
  const SVG_SIZE = 64
  // Mark fills 75% of tile, centered
  const markSize = tileSize * 0.75
  const scale = markSize / SVG_SIZE
  const offset = (tileSize - markSize) / 2

  ctx.save()
  ctx.translate(offset, offset)
  ctx.scale(scale, scale)

  for (const layer of MARK_LAYERS) {
    const pts = parsePoly(layer.points)
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.closePath()

    if (layer.stroke) {
      ctx.strokeStyle = hexToRgba(layer.fill, layer.opacity)
      ctx.lineWidth = 1.1
      ctx.stroke()
    } else {
      ctx.fillStyle = hexToRgba(layer.fill, layer.opacity)
      ctx.fill()
    }
  }

  ctx.restore()
}

// ── Icon generators ───────────────────────────────────────────────────────────

function generateFlat(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#110d06'
  ctx.fillRect(0, 0, size, size)
  drawMark(ctx, size)
  return canvas.toBuffer('image/png')
}

function generateRounded(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background fill
  ctx.fillStyle = '#110d06'
  ctx.fillRect(0, 0, size, size)

  // Rounded clip
  const r = size * 0.2
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(size - r, 0)
  ctx.quadraticCurveTo(size, 0, size, r)
  ctx.lineTo(size, size - r)
  ctx.quadraticCurveTo(size, size, size - r, size)
  ctx.lineTo(r, size)
  ctx.quadraticCurveTo(0, size, 0, size - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.clip()

  ctx.fillStyle = '#110d06'
  ctx.fillRect(0, 0, size, size)
  drawMark(ctx, size)
  return canvas.toBuffer('image/png')
}

// ── Output paths ──────────────────────────────────────────────────────────────

const root = path.join(__dirname, '..')
const publicDir = path.join(root, 'public')
const iosDir = path.join(publicDir, 'store-assets', 'ios')
const androidDir = path.join(publicDir, 'store-assets', 'android')

fs.mkdirSync(iosDir, { recursive: true })
fs.mkdirSync(androidDir, { recursive: true })

// ── PWA icons (existing) ──────────────────────────────────────────────────────

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), generateRounded(192))
console.log('✓ public/icon-192.png')

fs.writeFileSync(path.join(publicDir, 'icon-512.png'), generateRounded(512))
console.log('✓ public/icon-512.png')

// ── iOS App Store icons ───────────────────────────────────────────────────────
// 1024×1024: flat square — Apple adds rounded corners in the App Store
// All others: rounded (for device home screen previews / Xcode asset catalog)

const IOS_SIZES = [
  { size: 1024, flat: true,  name: 'icon-1024.png' },   // App Store
  { size: 180,  flat: false, name: 'icon-180.png'  },   // iPhone @3x
  { size: 120,  flat: false, name: 'icon-120.png'  },   // iPhone @2x
  { size: 167,  flat: false, name: 'icon-167.png'  },   // iPad Pro @2x
  { size: 152,  flat: false, name: 'icon-152.png'  },   // iPad @2x
  { size: 76,   flat: false, name: 'icon-76.png'   },   // iPad @1x
]

for (const { size, flat, name } of IOS_SIZES) {
  const buf = flat ? generateFlat(size) : generateRounded(size)
  fs.writeFileSync(path.join(iosDir, name), buf)
  console.log(`✓ store-assets/ios/${name}`)
}

// ── Android / Google Play icons ───────────────────────────────────────────────

const ANDROID_SIZES = [
  { size: 512, name: 'icon-512.png'  },  // Google Play Store
  { size: 192, name: 'icon-192.png'  },  // xxxhdpi
  { size: 144, name: 'icon-144.png'  },  // xxhdpi
  { size: 96,  name: 'icon-96.png'   },  // xhdpi
  { size: 72,  name: 'icon-72.png'   },  // hdpi
  { size: 48,  name: 'icon-48.png'   },  // mdpi
]

for (const { size, name } of ANDROID_SIZES) {
  fs.writeFileSync(path.join(androidDir, name), generateRounded(size))
  console.log(`✓ store-assets/android/${name}`)
}

console.log('\nAll icons generated.')
