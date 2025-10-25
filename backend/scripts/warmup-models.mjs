// backend/scripts/warmup-models.mjs
/* Warmly download+init the summarization pipelines so first request is fast. */
import { pipeline, env } from '@xenova/transformers';
import fs from 'fs';
import path from 'path';

const cacheDir = path.join(process.cwd(), '.cache', 'transformers');
try { fs.mkdirSync(cacheDir, { recursive: true }); } catch { }

env.allowRemoteModels = true;
env.allowLocalModels = true;
env.cacheDir = cacheDir;

// Optional HF token for gated/rate-limited access
const HF_TOKEN =
  process.env.HUGGINGFACE_TOKEN ||
  process.env.HF_TOKEN ||
  process.env.HUGGINGFACEHUB_API_TOKEN ||
  '';

if (HF_TOKEN && typeof fetch === 'function') {
  const origFetch = fetch;
  env.fetch = (url, opts = {}) =>
    origFetch(url, {
      ...opts,
      headers: { ...(opts.headers || {}), Authorization: `Bearer ${HF_TOKEN}` },
    });
}

const FAST = process.env.SUMMARIZER_FAST_MODEL || 'Xenova/pegasus-xsum';
const BEST = process.env.SUMMARIZER_BEST_MODEL || 'Xenova/bart-large-cnn';
const MID = process.env.SUMMARIZER_MODEL || 'Xenova/distilbart-cnn-12-6';

const FAST_CANDIDATES = (process.env.SUMMARIZER_FAST_MODEL_CANDIDATES ||
  `${FAST},Xenova/distilbart-cnn-12-6,Xenova/distilbart-cnn-6-6,Xenova/t5-small`
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const MODELS = [...new Set([...FAST_CANDIDATES, MID, BEST])];

async function warm(id) {
  process.stdout.write(`[warmup] downloading ${id}…\n`);
  const create = await pipeline('summarization', id);
  const sample = 'This is a short sentence so the pipeline initializes quickly.';
  await create(sample, { max_length: 30, min_length: 5, return_full_text: false });
  process.stdout.write(`[warmup] ${id} ready.\n`);
}

(async () => {
  for (const id of MODELS) {
    try { // keep going even if one fails
      // eslint-disable-next-line no-await-in-loop
      await warm(id);
    } catch (e) {
      process.stdout.write(`[warmup] failed for ${id}: ${e?.message || e}\n`);
    }
  }
  process.stdout.write('[warmup] done.\n');
})();
