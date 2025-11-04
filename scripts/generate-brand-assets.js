const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const OUTPUTS = [
  { file: 'assets/icon.png', size: 1024, variant: 'ios' },
  { file: 'assets/adaptive-icon.png', size: 1024, variant: 'android' },
  { file: 'assets/favicon.png', size: 96, variant: 'favicon' }
];

OUTPUTS.forEach(({ file, size, variant }) => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  drawBrandIcon(ctx, size, variant);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.resolve(file), buffer);
  console.log(`Generated ${file}`);
});

function drawBrandIcon(ctx, size, variant) {
  ctx.save();
  const scale = size / 1024;
  ctx.scale(scale, scale);

  // Background gradient + soft circle
  const backgroundGradient = ctx.createLinearGradient(0, 0, 1024, 1024);
  backgroundGradient.addColorStop(0, '#8D6BFF');
  backgroundGradient.addColorStop(1, '#4B2CD9');

  ctx.fillStyle = backgroundGradient;
  ctx.beginPath();
  ctx.arc(512, 512, 432, 0, Math.PI * 2);
  ctx.fill();

  const glowGradient = ctx.createRadialGradient(512, 360, 0, 512, 360, 360);
  glowGradient.addColorStop(0, 'rgba(255,255,255,0.35)');
  glowGradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(512, 360, 320, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(512, 512, 420, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(512, 512, 330, 0, Math.PI * 2);
  ctx.stroke();

  // Location pin fill
  const pinGradient = ctx.createLinearGradient(360, 280, 660, 720);
  pinGradient.addColorStop(0, '#FFFFFF');
  pinGradient.addColorStop(1, '#DCD4FF');

  ctx.fillStyle = pinGradient;
  drawPinFill(ctx);

  ctx.strokeStyle = 'rgba(141,107,255,0.25)';
  ctx.lineWidth = 24;
  drawPinOutline(ctx);

  ctx.beginPath();
  ctx.arc(512, 472, 96, 0, Math.PI * 2);
  ctx.strokeStyle = '#6C4DF4';
  ctx.lineWidth = 32;
  ctx.stroke();

  // Loop shelf highlight
  ctx.fillStyle = 'rgba(248,246,255,0.9)';
  drawShelf(ctx);

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.arc(638, 360, 32, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.arc(428, 336, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  if (variant === 'android') {
    // Adaptive icon foreground should stay centered with padding.
    // Add transparent padding by drawing into scaled group and leaving outer area empty.
    // Already handled via circular composition; no extra work needed but keep alpha outside the circle.
  }

  if (variant === 'favicon') {
    applyCircularMask(ctx, size);
  }
}

function applyCircularMask(ctx, size) {
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  const radius = size / 2;
  const center = radius;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center + 0.5;
      const dy = y - center + 0.5;
      if (Math.sqrt(dx * dx + dy * dy) > radius) {
        const index = (y * size + x) * 4 + 3;
        data[index] = 0;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function drawPinFill(ctx) {
  ctx.beginPath();
  ctx.moveTo(512, 268);
  ctx.bezierCurveTo(392, 268, 296, 364, 296, 484);
  ctx.bezierCurveTo(296, 656, 484, 806, 500, 818);
  ctx.bezierCurveTo(506, 822, 514, 822, 520, 818);
  ctx.bezierCurveTo(536, 806, 728, 656, 728, 484);
  ctx.bezierCurveTo(728, 364, 632, 268, 512, 268);
  ctx.closePath();
  ctx.fill();
}

function drawPinOutline(ctx) {
  ctx.beginPath();
  ctx.moveTo(512, 324);
  ctx.bezierCurveTo(625, 324, 717, 416, 717, 528);
  ctx.bezierCurveTo(717, 659, 568, 781, 515, 820);
  ctx.bezierCurveTo(513, 822, 511, 822, 509, 820);
  ctx.bezierCurveTo(456, 781, 307, 659, 307, 528);
  ctx.bezierCurveTo(307, 416, 399, 324, 512, 324);
  ctx.closePath();
  ctx.stroke();
}

function drawShelf(ctx) {
  ctx.beginPath();
  ctx.moveTo(566, 618);
  ctx.bezierCurveTo(614, 618, 654, 648, 666, 692);
  ctx.bezierCurveTo(668, 700, 661, 708, 653, 705);
  ctx.bezierCurveTo(592, 684, 538, 668, 480, 668);
  ctx.bezierCurveTo(422, 668, 368, 684, 307, 705);
  ctx.bezierCurveTo(299, 708, 292, 700, 294, 692);
  ctx.bezierCurveTo(306, 648, 346, 618, 394, 618);
  ctx.lineTo(566, 618);
  ctx.closePath();
  ctx.fill();
}
