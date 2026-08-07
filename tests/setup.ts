import { vi } from 'vitest';

process.env.TEST_MODE = 'true';
process.env.GEMINI_API_KEY = 'fake-key';
process.env.CODECOV_TOKEN = 'fake-token';

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] || null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  clear: vi.fn(() => { for (const key in store) delete store[key]; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
};

(global as any).localStorage = localStorageMock;
(global as any).window = {
  localStorage: localStorageMock,
};

