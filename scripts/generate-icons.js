// Run: node scripts/generate-icons.js
// Requires: canvas (already in node_modules)
// Generates the Cinis mark icon at 192x192 and 512x512

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size / 64; // scale factor — SVG viewBox is 0 0 64 64

  // Dark background
  ctx.fillStyle = '#110d06';
  ctx.fillRect(0, 0, size, size);

  // Rounded rect clip
  const r = size * 0.18;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.clip();

  // Re-fill background inside clip
  ctx.fillStyle = '#110d06';
  ctx.fillRect(0, 0, size, size);

  // Helper: draw a polygon from point array scaled by s
  function poly(points, fill, alpha) {
    ctx.beginPath();
    ctx.globalAlpha = alpha !== undefined ? alpha : 1;
    points.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x * s, y * s);
      else ctx.lineTo(x * s, y * s);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Outer hex outline (stroke only)
  ctx.beginPath();
  [[32,2],[56,15],[56,43],[32,56],[8,43],[8,15]].forEach(([x,y], i) => {
    if (i === 0) ctx.moveTo(x*s, y*s); else ctx.lineTo(x*s, y*s);
  });
  ctx.closePath();
  ctx.strokeStyle = '#FF6644';
  ctx.lineWidth = 1.1 * s;
  ctx.globalAlpha = 0.45;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Outer fill shape (path approximated as polygon)
  poly([[12.63,14.56],[29.37,5.44],[32,4],[34.63,5.44],[51.37,14.56],[54,16],[54,19],[54,39],[54,42],[51.37,43.44],[34.63,52.56],[32,54],[29.37,52.56],[12.63,43.44],[10,42],[10,39],[10,19],[10,16]], '#FF6644');

  // Inner dark shell
  poly([[14.9,16.1],[29.8,7.8],[32,6.6],[34.2,7.8],[49.1,16.1],[51.4,17.4],[51.4,20],[51.4,38],[51.4,40.6],[49.1,41.9],[34.2,50.2],[32,51.4],[29.8,50.2],[14.9,41.9],[12.6,40.6],[12.6,38],[12.6,20],[12.6,17.4]], '#120704');

  // Fire layers
  poly([[32,14],[46,22],[46,40],[32,48],[18,40],[18,22]], '#5A1005');
  poly([[32,20],[42,26],[42,40],[32,45],[22,40],[22,26]], '#A82010');
  poly([[32,26],[38,29],[38,40],[32,43],[26,40],[26,29]], '#E8321A');
  poly([[32,29],[45,40],[40,43],[32,47],[24,43],[19,40]], '#FF6644', 0.92);
  poly([[32,33],[41,40],[38,42],[32,45],[26,42],[23,40]], '#FFD0C0', 0.76);
  poly([[32,36],[37,40],[36,41],[32,43],[28,41],[27,40]], '#FFF0EB', 0.60);

  return canvas.toBuffer('image/png');
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), generateIcon(192));
console.log('Generated public/icons/icon-192x192.png');

fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), generateIcon(512));
console.log('Generated public/icons/icon-512x512.png');
