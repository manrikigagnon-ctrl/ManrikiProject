// Run this once to generate PWA icons: node generate-icons.js
// Requires: npm install canvas (only needed once for icon generation)
// Or just replace public/icon-192.png and public/icon-512.png with your own icons

const fs = require('fs');

// Generate a simple SVG icon and convert to a data note
const svgIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#0A0A0A"/>
  <text x="50%" y="53%" dominant-baseline="central" text-anchor="middle" 
    font-family="Arial, sans-serif" font-weight="900" font-size="${size * 0.45}" fill="#C44B28">M</text>
</svg>`;

// Write SVG versions (browsers handle these well)
fs.writeFileSync('public/icon-192.svg', svgIcon(192));
fs.writeFileSync('public/icon-512.svg', svgIcon(512));

console.log('SVG icons generated in public/');
console.log('');
console.log('For production PNG icons, use any SVG-to-PNG converter:');
console.log('  - https://svgtopng.com');
console.log('  - Or: npx svg2png public/icon-192.svg --output public/icon-192.png');
console.log('');
console.log('For now, update manifest.json to use .svg:');
console.log('  Change "icon-192.png" to "icon-192.svg"');
console.log('  Change "icon-512.png" to "icon-512.svg"');
