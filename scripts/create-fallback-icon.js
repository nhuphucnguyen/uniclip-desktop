const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, '../assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

// Create a 16x16 icon with a simple clipboard symbol
const canvas = createCanvas(16, 16);
const ctx = canvas.getContext('2d');

// Draw clipboard icon
ctx.fillStyle = '#000000';
ctx.fillRect(4, 2, 8, 12);
ctx.fillStyle = '#ffffff';
ctx.fillRect(5, 3, 6, 10);
ctx.fillStyle = '#000000';
ctx.fillRect(6, 1, 4, 2);

// Save the icon files
['icon.png', 'icon-small.png', 'icon-template.png', 'fallback.png'].forEach(filename => {
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(assetsDir, filename), buffer);
});
