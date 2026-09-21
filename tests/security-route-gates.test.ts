import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

/**
 * Boots the REST surface with NODE_ENV=production (IS_DEV === false) to prove
 * the dev-only routes disappear and the economy routes reject anonymous calls.
 */
let server: Server;
let base: string;
let previousNodeEnv: string | undefined;
let previousWindow: unknown;

beforeAll(async () => {
  previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  // The shared gate treats a defined `window` as a browser bundle; the test
  // harness installs a DOM mock, so drop it to evaluate the server branch.
  previousWindow = (globalThis as { window?: unknown }).window;
  delete (globalThis as { window?: unknown }).window;
  vi.resetModules();

  const { registerApiRoutes } = await import('../server/routes/api-routes');
  const { resolveAllowedOrigin } = await import('../server/security/cors-config');

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    const allowed = resolveAllowedOrigin(req.headers.origin);
    res.setHeader('Vary', 'Origin');
    if (allowed) res.setHeader('Access-Control-Allow-Origin', allowed);
    next();
  });
  registerApiRoutes(app);

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
  (globalThis as { window?: unknown }).window = previousWindow;
  vi.resetModules();
});

describe('production route gates', () => {
  it('hides the debug, log and sentry-trigger endpoints', async () => {
    for (const path of ['/api/logs', '/api/debug', '/api/debug-sentry']) {
      expect((await fetch(`${base}${path}`)).status).toBe(404);
    }
    const logged = await fetch(`${base}/api/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(['hello'])
    });
    expect(logged.status).toBe(404);
  });

  it('never serves Doppler secrets', async () => {
    const res = await fetch(`${base}/api/doppler-client-secrets`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ available: false });
  });

  it('keeps the health endpoint reachable', async () => {
    expect((await fetch(`${base}/api/health`)).status).toBe(200);
  });
});

describe('asset proxy SSRF guard', () => {
  it('rejects non-allowlisted targets', async () => {
    for (const url of [
      'http://169.254.169.254/latest/meta-data/',
      'https://evil.example/payload.glb',
      'file:///etc/passwd'
    ]) {
      const res = await fetch(`${base}/api/proxy-asset?url=${encodeURIComponent(url)}`);
      expect(res.status).toBe(400);
    }
  });
});

describe('economy and player authentication', () => {
  const mutations: Array<[string, unknown]> = [
    ['/api/economy/init-player', {}],
    ['/api/economy/purchase', { itemId: 'test_skin' }],
    ['/api/economy/claim-daily', {}],
    ['/api/economy/ad-reward', {}],
    ['/api/economy/match-rewards', { adMultiplier: 1000 }],
    ['/api/match/lock', { matchId: 'M_1' }],
    ['/api/player/loadout', { classId: 'ASSAULT', items: [] }],
    ['/api/player/item-skins', { skins: {} }]
  ];

  it('rejects unauthenticated and bogus-token mutations with 401', async () => {
    for (const [path, body] of mutations) {
      const anonymous = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      expect(anonymous.status, `${path} without token`).toBe(401);

      const forged = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer not-a-real-token' },
        body: JSON.stringify(body)
      });
      expect(forged.status, `${path} with forged token`).toBe(401);
    }
  });

  it('rejects a spoofed internal service token', async () => {
    const res = await fetch(`${base}/api/economy/match-rewards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vexea-internal-token': 'deadbeef',
        Authorization: 'Bearer nope'
      },
      body: JSON.stringify({ playerId: 'victim', adMultiplier: 1000 })
    });
    expect(res.status).toBe(401);
  });
});

describe('CORS in production', () => {
  it('echoes only allowlisted client origins and always varies on Origin', async () => {
    const allowed = await fetch(`${base}/api/health`, {
      headers: { Origin: 'https://vexea-e0a37.web.app' }
    });
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://vexea-e0a37.web.app');
    expect(allowed.headers.get('vary')).toContain('Origin');

    for (const origin of ['https://attacker.example', 'https://preview-abc.run.app', 'http://localhost:5173']) {
      const res = await fetch(`${base}/api/health`, { headers: { Origin: origin } });
      expect(res.headers.get('access-control-allow-origin'), origin).toBeNull();
    }
  });
});
