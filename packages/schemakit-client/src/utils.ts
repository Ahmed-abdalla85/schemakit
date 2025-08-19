import type { RetryPolicy } from './types';

export function buildQueryString(params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value) searchParams.append(key, String(v));
    } else if (typeof value === 'boolean') {
      searchParams.set(key, value ? 'true' : 'false');
    } else {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export function joinUrl(base: string, path: string): string {
  if (!base) return path;
  if (!path) return base;
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export async function withRetry<T>(fn: () => Promise<T>, policy?: RetryPolicy): Promise<T> {
  if (!policy || policy.retries <= 0) return fn();
  const factor = policy.factor ?? 2;
  const min = policy.min ?? 200;
  const max = policy.max ?? 2000;
  let attempt = 0;
  let lastError: unknown;
  // First try without delay
  try {
    return await fn();
  } catch (err) {
    lastError = err;
  }
  while (attempt < policy.retries) {
    attempt += 1;
    const delay = Math.min(max, Math.round(min * Math.pow(factor, attempt - 1)));
    await new Promise((r) => setTimeout(r, delay));
    if (policy.retryOn) {
      const should = await policy.retryOn(lastError, attempt);
      if (!should) break;
    }
    try {
      return await fn();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { fetchImpl?: typeof fetch },
  timeoutMs?: number
): Promise<Response> {
  const fetchImpl = init.fetchImpl ?? fetch;
  if (!timeoutMs || timeoutMs <= 0) {
    return fetchImpl(input, init);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const signal = init.signal
    ? mergeAbortSignals(init.signal as AbortSignal, controller.signal)
    : controller.signal;
  try {
    const { fetchImpl: _omit, ...rest } = init as any;
    const resp = await fetchImpl(input, { ...rest, signal });
    return resp;
  } finally {
    clearTimeout(timeout);
  }
}

export function mergeAbortSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const onAbortA = () => controller.abort();
  const onAbortB = () => controller.abort();
  if (a.aborted || b.aborted) controller.abort();
  else {
    a.addEventListener('abort', onAbortA);
    b.addEventListener('abort', onAbortB);
  }
  return controller.signal;
}

export function mergeHeaders(...headersList: Array<Record<string, string> | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const headers of headersList) {
    if (!headers) continue;
    for (const [k, v] of Object.entries(headers)) {
      result[k] = v;
    }
  }
  return result;
}
