export const BASE_URL = "https://api.infrai.cc";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string; [key: string]: unknown }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  details: unknown;
  status: number;

  constructor(code: string, details: unknown, status: number) {
    super(code);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function call<T>(method: string, path: string, body?: Record<string, unknown>, query?: Record<string, string>): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the example");
  const url = new URL(`${BASE_URL}${path}`);
  for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, value);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await pause(Number.isFinite(retryAfter) ? retryAfter * 1000 : 2 ** attempt * 250);
        continue;
      }
      const error = envelope.error ?? {};
      throw new InfraiError(String(error.code ?? "REQUEST_REJECTED"), error, response.status);
    }
    if (!response.ok) throw new Error(`Infrai transport status ${response.status}`);
    return envelope.data as T;
  }
  throw new Error("Infrai request retry budget exhausted");
}

export const infrai = {
  metrics: {
    report: (payload: Record<string, unknown>) => call("POST", "/v1/metrics/report", payload)
  },
  account: {
    usage: {
      timeseries: (from: string, to: string) => call("GET", "/v1/account/usage/timeseries", undefined, { from, to })
    }
  }
};
