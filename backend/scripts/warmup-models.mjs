// backend/scripts/warmup-models.mjs
// Warm downloads and compiles models into .cache so your first request is fast.

import { pipeline, env } from '@xenova/transformers';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cacheDir = path.join(__dirname, '..', '.cache', 'transformers');

fs.mkdirSync(cacheDir, { recursive: true });
env.cacheDir = cacheDir;
env.allowRemoteModels = true;

async function warm(modelId) {
  process.stdout.write(`[warmup] downloading ${modelId}…\n`);
  const pipe = await pipeline('summarization', modelId);
  // small run compiles kernels
  await pipe('This is a short warmup sentence for compilation.', {
    min_length: 10,
    max_length: 30,
    do_sample: false,
  });
  process.stdout.write(`[warmup] ${modelId} ready.\n`);
}

await warm('Xenova/distilbart-cnn-6-6');   // Fast
await warm('Xenova/distilbart-cnn-12-6');  // Best

console.log('[warmup] done.');
