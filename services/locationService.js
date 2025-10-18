const BASE_URL = 'https://countriesnow.space/api/v0.1';

async function fetchJson(url, options) {
  try {
    const response = await fetch(url, options);
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
    console.warn('locationService error:', error?.message ?? error);
    throw error;
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
