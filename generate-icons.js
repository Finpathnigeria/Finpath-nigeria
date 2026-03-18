// generate-icons.js — creates all required PWA icon sizes as SVG then converts
// Run: node generate-icons.js
// Uses: npm install sharp (or just use the SVG directly for web)

const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// Create SVG icon template
function createIconSVG(size, withPadding = false) {
  const pad = withPadding ? Math.round(size * 0.1) : 0;
  const inner = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2;
  const r = inner / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B3D2E"/>
      <stop offset="100%" stop-color="#1A6B4A"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  ${withPadding
    ? `<rect width="${size}" height="${size}" fill="#0B3D2E"/>`
    : `<rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="url(#bg)"/>`
  }
  <!-- Circle -->
  <circle cx="${cx}" cy="${cy - size * 0.05}" r="${r * 0.72}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="${size * 0.025}"/>
  <!-- F letter -->
  <text
    x="${cx}"
    y="${cy + size * 0.09}"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="${size * 0.42}"
    font-weight="bold"
    text-anchor="middle"
    fill="white"
    letter-spacing="-1"
  >F</text>
  <!-- Gold dot -->
  <circle cx="${cx + size * 0.16}" cy="${cy - size * 0.14}" r="${size * 0.055}" fill="#F0B429"/>
  <!-- "Nigeria" text (only visible at larger sizes) -->
  ${size >= 128 ? `<text x="${cx}" y="${size * 0.88}" font-family="Arial, sans-serif" font-size="${size * 0.1}" font-weight="600" text-anchor="middle" fill="rgba(255,255,255,0.55)" letter-spacing="${size * 0.008}">NIGERIA</text>` : ''}
</svg>`;
}

// Generate all icon sizes
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const faviconSizes = [16, 32];

sizes.forEach(size => {
  const svgContent = createIconSVG(size, size === 192 || size === 512); // maskable need padding
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.svg`), svgContent);
  console.log(`✓ Created icon-${size}x${size}.svg`);
});

faviconSizes.forEach(size => {
  const svgContent = createIconSVG(size, false);
  fs.writeFileSync(path.join(iconsDir, `favicon-${size}x${size}.svg`), svgContent);
  console.log(`✓ Created favicon-${size}x${size}.svg`);
});

// Create a master SVG for reference
fs.writeFileSync(path.join(iconsDir, 'icon-master.svg'), createIconSVG(512, false));

console.log('\n✅ SVG icons generated in public/icons/');
console.log('\n📌 NEXT STEP: Convert SVGs to PNG using one of these methods:');
console.log('   Option A (easiest): Upload icon-master.svg to https://realfavicongenerator.net');
console.log('   Option B: npm install sharp && node convert-to-png.js');
console.log('   Option C: Use Figma / Canva to create branded icons and export as PNG');
console.log('\n   The icon should show a dark green background with white "F" and gold dot.');
