import { describe, it, expect } from 'vitest';
import { filterClientSecrets } from '../server/security/client-secret-filter';
import { isAllowedAssetUrl } from '../server/security/url-allowlist';
import { isAllowedClientOrigin, resolveAllowedOrigin, PRODUCTION_CLIENT_ORIGINS } from '../server/security/cors-config';
import { clampAdMultiplier } from '../server/security/ad-multiplier';
import { sanitizeClientLog, MAX_LOG_LENGTH, MAX_LOG_ENTRIES } from '../server/security/log-sanitizer';
import { getInternalServiceToken, isInternalServiceToken } from '../server/security/internal-token';
import { IS_DEV } from '../shared/gates/production.gate';

describe('client secret filter', () => {
  it('keeps only VITE_ prefixed keys', () => {
    const filtered = filterClientSecrets({
      VITE_SENTRY_DSN: 'dsn',
      VITE_SERVER_URL: 'https://server.example',
      SENTRY_DSN: 'raw-dsn',
      FIREBASE_SERVICE_ACCOUNT: '{"private_key":"x"}',
      DOPPLER_TOKEN: 'dp.token',
    });

    expect(Object.keys(filtered).sort()).toEqual(['VITE_SENTRY_DSN', 'VITE_SERVER_URL']);
  });

  it('tolerates empty or malformed payloads', () => {
    expect(filterClientSecrets(null)).toEqual({});
    expect(filterClientSecrets(undefined)).toEqual({});
    expect(filterClientSecrets({ VITE_NULL: null })).toEqual({});
  });
});

describe('asset url allowlist', () => {
  it('permits the asset CDN over https', () => {
    expect(isAllowedAssetUrl('https://vexea-r2-asset-guard.alte.workers.dev/models/drone.glb')).toBe(true);
  });

  it('rejects other hosts, schemes and credentials', () => {
    expect(isAllowedAssetUrl('http://vexea-r2-asset-guard.alte.workers.dev/a.glb')).toBe(false);
    expect(isAllowedAssetUrl('https://evil.example/a.glb')).toBe(false);
    expect(isAllowedAssetUrl('https://vexea-r2-asset-guard.alte.workers.dev.evil.example/a.glb')).toBe(false);
    expect(isAllowedAssetUrl('https://user:pass@vexea-r2-asset-guard.alte.workers.dev/a.glb')).toBe(false);
    expect(isAllowedAssetUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
    expect(isAllowedAssetUrl('file:///etc/passwd')).toBe(false);
    expect(isAllowedAssetUrl('')).toBe(false);
  });
});

describe('cors origin allowlist', () => {
  it('permits the production Firebase Hosting client origins', () => {
    for (const origin of PRODUCTION_CLIENT_ORIGINS) {
      expect(isAllowedClientOrigin(origin)).toBe(true);
      expect(resolveAllowedOrigin(origin)).toBe(origin);
    }
  });

  it('never echoes a wildcard or unknown origin', () => {
    expect(resolveAllowedOrigin('*')).toBeNull();
    expect(resolveAllowedOrigin('https://attacker.example')).toBeNull();
    expect(resolveAllowedOrigin(undefined)).toBeNull();
  });

  it('permits AI Studio and localhost client origins only in dev', () => {
    const expected = IS_DEV;
    expect(isAllowedClientOrigin('https://preview-abc.run.app')).toBe(expected);
    expect(isAllowedClientOrigin('http://localhost:5173')).toBe(expected);
  });
});

describe('ad multiplier clamp', () => {
  it('accepts only the granted multipliers', () => {
    expect(clampAdMultiplier(1)).toBe(1);
    expect(clampAdMultiplier(2)).toBe(2);
    expect(clampAdMultiplier(1000)).toBe(1);
    expect(clampAdMultiplier('2')).toBe(2);
    expect(clampAdMultiplier(undefined)).toBe(1);
    expect(clampAdMultiplier(Number.NaN)).toBe(1);
  });
});

describe('client log sanitizer', () => {
  it('coerces and caps forwarded payloads', () => {
    const long = 'x'.repeat(MAX_LOG_LENGTH * 2);
    expect(sanitizeClientLog([long]).length).toBe(MAX_LOG_LENGTH);
    expect(sanitizeClientLog([{ a: 1 }])).toBe('{"a":1}');
    expect(sanitizeClientLog('plain')).toBe('plain');

    const many = Array.from({ length: MAX_LOG_ENTRIES * 2 }, () => 'a');
    expect(sanitizeClientLog(many).split(' ').length).toBe(MAX_LOG_ENTRIES);
  });
});

describe('internal service token', () => {
  it('accepts only the boot-generated token', () => {
    const token = getInternalServiceToken();
    expect(isInternalServiceToken(token)).toBe(true);
    expect(isInternalServiceToken('')).toBe(false);
    expect(isInternalServiceToken('deadbeef')).toBe(false);
    expect(isInternalServiceToken('f'.repeat(token.length))).toBe(false);
  });
});
