type AmadeusTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

let cachedToken: { token: string; expiresAt: number } | null = null;
let tokenPromise: Promise<string> | null = null;

const BASE_URL = "https://test.api.amadeus.com"; // sandbox
// later switch to: https://api.amadeus.com (production)

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

async function fetchNewToken(): Promise<string> {
  const clientId = getEnv("AMADEUS_CLIENT_ID");
  const clientSecret = getEnv("AMADEUS_CLIENT_SECRET");

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(`${BASE_URL}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token fetch failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as AmadeusTokenResponse;

  const now = Date.now();
  cachedToken = {
    token: json.access_token,
    expiresAt: now + json.expires_in * 1000,
  };

  return cachedToken.token;
}

export async function getAmadeusToken(): Promise<string> {
  const now = Date.now();

  // Give ourselves a small buffer so we don't use a token that's about to expire
  if (cachedToken && cachedToken.expiresAt > now + 30_000) return cachedToken.token;

  // If a token request is already happening, await it instead of starting another
  if (tokenPromise) return tokenPromise;

  tokenPromise = fetchNewToken()
    .finally(() => {
      tokenPromise = null;
    });

  return tokenPromise;
}

async function amadeusGetOnce<T>(path: string, params: Record<string, string>) {
  const token = await getAmadeusToken();
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    // Keep status in the message so the caller can decide what to do
    throw new Error(`Amadeus GET ${path} failed: ${res.status} ${text}`);
  }

  return (await res.json()) as T;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function amadeusGet<T>(path: string, params: Record<string, string>) {
  try {
    return await amadeusGetOnce<T>(path, params);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";

    // Retry once on 401
    if (message.includes(" 401 ")) {
      cachedToken = null;
      return await amadeusGetOnce<T>(path, params);
    }

    // Retry once on transient Amadeus 5xx
    if (message.includes(" 500 ") || message.includes(" 502 ") || message.includes(" 503 ")) {
      await sleep(400);
      return await amadeusGetOnce<T>(path, params);
    }

    throw e;
  }
}
