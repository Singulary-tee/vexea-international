import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { registerApiRoutes } from '../server/routes/api-routes';
import { resolveAllowedOrigin } from '../server/security/cors-config';
import { IS_DEV } from '../shared/gates/production.gate';

/**
 * The AI Studio preview relies on the dev-only REST fallbacks. This asserts they
 * stay reachable while IS_DEV is true, alongside the always-on SSRF allowlist.
 */
let server: Server;
let base: string;

beforeAll(async () => {
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
});

describe('AI Studio dev fallbacks', () => {
  it('runs with the dev gate enabled', () => {
    expect(IS_DEV).toBe(true);
  });

  it('keeps the debug, log and secrets endpoints reachable', async () => {
    expect((await fetch(`${base}/api/logs`)).status).toBe(200);
    expect((await fetch(`${base}/api/debug`)).status).toBe(200);

    const logged = await fetch(`${base}/api/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(['preview log'])
    });
    expect(logged.status).toBe(200);

    // No Doppler token in the harness: the route answers without calling out.
    const secrets = await fetch(`${base}/api/doppler-client-secrets`);
    expect(secrets.status).toBe(200);
  });

  it('still enforces the asset proxy allowlist in dev', async () => {
    const res = await fetch(`${base}/api/proxy-asset?url=${encodeURIComponent('http://169.254.169.254/')}`);
    expect(res.status).toBe(400);
  });

  it('allows the preview and localhost client origins', async () => {
    for (const origin of ['https://preview-abc.run.app', 'http://localhost:5173']) {
      const res = await fetch(`${base}/api/health`, { headers: { Origin: origin } });
      expect(res.headers.get('access-control-allow-origin')).toBe(origin);
      expect(res.headers.get('vary')).toContain('Origin');
    }
  });
});
