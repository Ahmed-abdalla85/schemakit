// e2e.smoke.test.ts - Bun test hitting the Elysia example against a real DB
import { expect, test, beforeAll, afterAll } from 'bun:test';
try {
  const path = new URL('./.env', import.meta.url).pathname;
  // Bun automatically loads .env from CWD; set variables manually if present
  const text = await fetch(`file://${path}`).then(r => r.text()).catch(() => '');
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) {
      const [, k, v] = m;
      if (!process.env[k]) process.env[k] = v.replace(/^"|"$/g, '');
    }
  }
} catch {}

// Fallback: if not provided, prefer postgres (example is designed for it)
if (!process.env.DB_TYPE) process.env.DB_TYPE = 'postgres';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const HEADERS: HeadersInit = { 'x-tenant-id': 'demo', 'x-tenant-key': 'e2e' };
let stopServer: (() => void) | undefined;

async function waitForHealth(timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) return;
    } catch {}
    if (Date.now() - start > timeoutMs) throw new Error('Server did not become healthy in time');
    await new Promise(r => setTimeout(r, 300));
  }
}

beforeAll(async () => {
  // Start the example server programmatically
  const mod = await import('./index.ts');
  const { stop } = await mod.startServer();
  stopServer = stop;
  await waitForHealth();
});

afterAll(async () => {
  try { stopServer?.(); } catch {}
});

// Basic smoke: health
test('health returns ok', async () => {
  const res = await fetch(`${BASE_URL}/health`);
  expect(res.ok).toBe(true);
  const data = await res.json();
  expect(data.status).toBe('ok');
});

// List entities (placeholder endpoint)
test('list entities', async () => {
  const res = await fetch(`${BASE_URL}/api/entities`, { headers: HEADERS });
  expect(res.ok).toBe(true);
  const body = await res.json();
  expect(body.success).toBe(true);
});

test('list entities without tenant headers should fail', async () => {
  const res = await fetch(`${BASE_URL}/api/entities`);
  expect(res.ok).toBe(false);
});


// Additional endpoints requested
test('system entities list endpoint success true', async () => {
  const res = await fetch(`${BASE_URL}/api/entity/entities?page=1&limit=5`, { headers: HEADERS });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new Error(`entities list failed: status=${res.status} body=${JSON.stringify(body)}`);
  }
  expect(body.success).toBe(true);
});

test('system entities list endpoint without tenant headers should fail', async () => {
  const res = await fetch(`${BASE_URL}/api/entity/entities?page=1&limit=5`);
  expect(res.ok).toBe(false);
});

test('system entities default view success true', async () => {
  const res = await fetch(`${BASE_URL}/api/entity/entities/views/default`, { headers: HEADERS });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new Error(`entities default view failed: status=${res.status} body=${JSON.stringify(body)}`);
  }
  expect(body.success).toBe(true);
});

