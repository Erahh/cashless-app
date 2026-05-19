const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const size = 512;
const png = new PNG({ width: size, height: size });

function clamp(v, min = 0, max = 255) {
  return Math.max(min, Math.min(max, v));
}

function blendPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const idx = (size * y + x) << 2;
  const srcA = a / 255;
  const dstA = png.data[idx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  const blend = (src, dst) => Math.round((src * srcA + dst * dstA * (1 - srcA)) / (outA || 1));
  png.data[idx] = blend(r, png.data[idx]);
  png.data[idx + 1] = blend(g, png.data[idx + 1]);
  png.data[idx + 2] = blend(b, png.data[idx + 2]);
  png.data[idx + 3] = Math.round(outA * 255);
}

function fillRect(x0, y0, x1, y1, colorFn) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const c = colorFn(x, y);
      blendPixel(x, y, c[0], c[1], c[2], c[3]);
    }
  }
}

function drawRadialGradient(cx, cy, r0, r1, inner, outer) {
  const minX = Math.floor(cx - r1), maxX = Math.ceil(cx + r1);
  const minY = Math.floor(cy - r1), maxY = Math.ceil(cy + r1);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const t = clamp((d - r0) / (r1 - r0), 0, 1);
      const r = Math.round(inner[0] + (outer[0] - inner[0]) * t);
      const g = Math.round(inner[1] + (outer[1] - inner[1]) * t);
      const b = Math.round(inner[2] + (outer[2] - inner[2]) * t);
      const a = Math.round((inner[3] + (outer[3] - inner[3]) * t));
      blendPixel(x, y, r, g, b, a);
    }
  }
}

function drawCircle(cx, cy, r, color) {
  const minX = Math.floor(cx - r), maxX = Math.ceil(cx + r);
  const minY = Math.floor(cy - r), maxY = Math.ceil(cy + r);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) blendPixel(x, y, color[0], color[1], color[2], color[3]);
    }
  }
}

function pointInPoly(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0], yi = points[i][1];
    const xj = points[j][0], yj = points[j][1];
    const intersect = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi + 0.00001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function drawPolygon(points, color) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.floor(Math.min(...xs));
  const maxX = Math.ceil(Math.max(...xs));
  const minY = Math.floor(Math.min(...ys));
  const maxY = Math.ceil(Math.max(...ys));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (pointInPoly(x + 0.5, y + 0.5, points)) blendPixel(x, y, color[0], color[1], color[2], color[3]);
    }
  }
}

function transform(points, angleDeg, cx, cy, scale = 1) {
  const a = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return points.map(([x, y]) => {
    const sx = x * scale;
    const sy = y * scale;
    return [cx + sx * cos - sy * sin, cy + sx * sin + sy * cos];
  });
}

// Background
drawRadialGradient(256, 220, 0, 370, [18, 44, 86, 255], [10, 24, 51, 255]);
drawRadialGradient(256, 240, 120, 330, [22, 74, 134, 45], [10, 24, 51, 0]);

// Outer cyan aura
drawCircle(256, 255, 170, [33, 224, 255, 28]);
drawCircle(256, 255, 150, [33, 224, 255, 22]);

// Purple shell petals
const petalBase = [
  [0, -150],
  [58, -112],
  [82, -30],
  [64, 24],
  [38, 90],
  [0, 124],
  [-38, 90],
  [-64, 24],
  [-82, -30],
  [-58, -112],
];
const petalInnerHighlight = [
  [0, -122],
  [46, -93],
  [58, -22],
  [46, 24],
  [26, 70],
  [0, 98],
  [-26, 70],
  [-46, 24],
  [-58, -22],
  [-46, -93],
];

[0, 60, 120, 180, 240, 300].forEach((deg) => {
  drawPolygon(transform(petalBase, deg, 256, 255, 1), [75, 40, 132, 255]);
  drawPolygon(transform(petalInnerHighlight, deg, 256, 255, 1), [195, 179, 255, 128]);
});

// Shell ring and inner shell
drawCircle(256, 255, 150, [124, 62, 200, 255]);
drawCircle(256, 255, 128, [43, 20, 61, 255]);
drawCircle(256, 255, 110, [114, 74, 178, 150]);

// Center burst
const burst = [];
for (let i = 0; i < 16; i++) {
  const ang = (Math.PI * 2 * i) / 16 - Math.PI / 2;
  const radius = i % 2 === 0 ? 92 : 58;
  burst.push([256 + Math.cos(ang) * radius, 255 + Math.sin(ang) * radius]);
}
drawPolygon(burst, [255, 125, 15, 255]);

const burst2 = [];
for (let i = 0; i < 16; i++) {
  const ang = (Math.PI * 2 * i) / 16 - Math.PI / 2;
  const radius = i % 2 === 0 ? 72 : 44;
  burst2.push([256 + Math.cos(ang) * radius, 255 + Math.sin(ang) * radius]);
}
drawPolygon(burst2, [255, 219, 75, 200]);

// Checkmark
function thickLine(x0, y0, x1, y1, width, color) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const half = width / 2;
  const poly = [
    [x0 + px * half, y0 + py * half],
    [x0 - px * half, y0 - py * half],
    [x1 - px * half, y1 - py * half],
    [x1 + px * half, y1 + py * half],
  ];
  drawPolygon(poly, color);
}

thickLine(184, 252, 228, 298, 26, [255, 248, 222, 255]);
thickLine(228, 298, 326, 198, 26, [255, 248, 222, 255]);
thickLine(184, 252, 228, 298, 12, [249, 214, 106, 255]);
thickLine(228, 298, 326, 198, 12, [249, 214, 106, 255]);

// Dark contour
drawCircle(256, 255, 180, [25, 11, 39, 0]);

const outPath = path.join(__dirname, '..', 'src', 'assets', 'businessverified-badge.png');
png.pack().pipe(fs.createWriteStream(outPath));