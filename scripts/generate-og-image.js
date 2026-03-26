const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const width = 1200;
const height = 630;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#211A14';
ctx.fillRect(0, 0, width, height);

// Left side: CINIS wordmark
ctx.font = 'bold 72px Arial';
ctx.fillStyle = '#F5F0E3';
ctx.textBaseline = 'top';
const wordmarkX = 80;
const wordmarkY = 280;
ctx.fillText('CINIS', wordmarkX, wordmarkY);

// Separator line
ctx.strokeStyle = '#F5F0E318';
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(80, 310);
ctx.lineTo(520, 310);
ctx.stroke();

// Tagline
ctx.font = '32px Arial';
ctx.fillStyle = '#FF6644';
ctx.textBaseline = 'top';
ctx.fillText('Where start meets finished.', 80, 340);

// Right side: Hexagon layers
const centerX = 950;
const centerY = 315;
const outerRadius = 160;

// Helper function to draw a regular polygon (hexagon)
function drawHexagon(cx, cy, radius, fillColor) {
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  const sides = 6;
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

// Draw hexagon layers from outside in
const layers = [
  { radius: outerRadius, color: '#FF6644' },        // Layer 1
  { radius: outerRadius * 0.85, color: '#120704' }, // Layer 2
  { radius: outerRadius * 0.70, color: '#5A1005' }, // Layer 3
  { radius: outerRadius * 0.55, color: '#A82010' }, // Layer 4
  { radius: outerRadius * 0.40, color: '#E8321A' }, // Layer 5
  { radius: outerRadius * 0.25, color: '#FF6644' }  // Layer 6 (innermost)
];

layers.forEach(layer => {
  drawHexagon(centerX, centerY, layer.radius, layer.color);
});

// Save to file
const outputPath = path.join(__dirname, '../public/og-image.png');
const stream = canvas.createPNGStream();
const file = fs.createWriteStream(outputPath);

stream.pipe(file);
file.on('finish', () => {
  const stats = fs.statSync(outputPath);
  console.log(`✓ og-image.png created: ${stats.size} bytes`);
});
