const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a 48x48 canvas
const canvas = createCanvas(48, 48);
const ctx = canvas.getContext('2d');

// Draw background circle
ctx.fillStyle = '#6C4DF4';
ctx.beginPath();
ctx.arc(24, 24, 24, 0, Math.PI * 2);
ctx.fill();

// Set up for drawing the LL logo
ctx.strokeStyle = '#FFFFFF';
ctx.lineWidth = 3.5;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

// Draw First L (left, slightly higher)
ctx.beginPath();
ctx.moveTo(15, 14);  // -9 + 24, -10 + 24
ctx.lineTo(15, 26.5); // -9 + 24, 2.5 + 24
ctx.lineTo(22.5, 26.5); // -1.5 + 24, 2.5 + 24
ctx.stroke();

// Draw Second L (right, slightly lower)
ctx.beginPath();
ctx.moveTo(25.5, 16.5); // 1.5 + 24, -7.5 + 24
ctx.lineTo(25.5, 29); // 1.5 + 24, 5 + 24
ctx.lineTo(33, 29); // 9 + 24, 5 + 24
ctx.stroke();

// Save as PNG
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('assets/favicon.png', buffer);
console.log('Favicon generated successfully!');
