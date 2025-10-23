const DEFAULT_BASE_URL =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUMMARY_API_URL) ||
  'http://localhost:4000';
const SUMMARY_PATH = '/summaries';

const buildEndpoint = (path) => {
  const trimmedBase = DEFAULT_BASE_URL.replace(/\/$/, '');
  return `${trimmedBase}${path}`;
};

export async function summarizePostDescription(description, { signal } = {}) {
  const text = typeof description === 'string' ? description.trim() : '';
  if (!text) {
    throw new Error('Add a description before requesting a summary.');
  }

  try {
    const response = await fetch(buildEndpoint(SUMMARY_PATH), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text }),
      signal
    });

    const payload = await response.json();

    if (!response.ok) {
      const message = payload?.error ?? 'Unable to summarize description.';
      throw new Error(message);
    }

    if (!payload?.summary) {
      throw new Error('Summary response was empty.');
    }

    return {
      summary: String(payload.summary).trim(),
      model: payload.model ?? 'facebook/bart-large-cnn'
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message || 'Failed to summarize description.');
  }
}
