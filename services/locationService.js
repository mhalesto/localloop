const BASE_URL = 'https://countriesnow.space/api/v0.1';

const REQUEST_TIMEOUT_MS = 10000;

async function fetchJson(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => {
        controller.abort();
      }, timeoutMs)
    : null;

  try {
    const response = await fetch(
      url,
      controller ? { ...options, signal: controller.signal } : options
    );
    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }
    const payload = await response.json();
    if (payload.error) {
      const message = payload.msg || 'Request error';
      throw new Error(message);
    }
    return payload.data;
  } catch (error) {
    const normalizedError =
      error?.name === 'AbortError'
        ? new Error('Request timed out')
        : error instanceof Error
        ? error
        : new Error(String(error));
    console.warn('locationService error:', normalizedError?.message ?? normalizedError);
    throw normalizedError;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function fetchCountries() {
  const data = await fetchJson(`${BASE_URL}/countries/positions`);
  return data.map((item) => ({
    name: item.name,
    iso2: item.iso2,
    iso3: item.iso3
  }));
}

export async function fetchStates(country) {
  const data = await fetchJson(`${BASE_URL}/countries/states`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ country })
  });

  return (data.states ?? []).map((state) => state.name);
}

export async function fetchCities(country, state) {
  const data = await fetchJson(`${BASE_URL}/countries/state/cities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ country, state })
  });

  return data ?? [];
}
