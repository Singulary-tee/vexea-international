import { vi } from 'vitest';

process.env.TEST_MODE = 'true';
process.env.GEMINI_API_KEY = 'fake-key';
process.env.CODECOV_TOKEN = 'fake-token';

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  cert: vi.fn(),
  getApps: vi.fn().mockReturnValue([]),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn().mockReturnValue({
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    set: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
  }),
  FieldValue: { increment: vi.fn() },
}));

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] || null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  clear: vi.fn(() => { for (const key in store) delete store[key]; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
};

(global as any).localStorage = localStorageMock;
(global as any).sessionStorage = localStorageMock;

const createMockElement = (tag: string) => ({
  tagName: (tag || '').toUpperCase(),
  className: '',
  style: { setProperty: vi.fn(), display: 'none', opacity: '1' },
  appendChild: vi.fn((child: any) => child),
  insertBefore: vi.fn((child: any) => child),
  removeChild: vi.fn(),
  setAttribute: vi.fn(),
  getAttribute: vi.fn().mockReturnValue(''),
  removeAttribute: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  querySelector: vi.fn(),
  querySelectorAll: vi.fn().mockReturnValue([]),
  getContext: vi.fn().mockReturnValue({
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 10 }),
  }),
});

const mockDocument = {
  getElementById: (id: string) => ({
    id: id,
    ...createMockElement('div'),
  }),
  createElement: (tag: string) => createMockElement(tag),
  createElementNS: (_ns: string, tag: string) => createMockElement(tag),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  querySelector: vi.fn(),
  querySelectorAll: vi.fn().mockReturnValue([]),
  body: createMockElement('body'),
  head: createMockElement('head'),
};

(global as any).document = mockDocument;

(global as any).window = {
  localStorage: localStorageMock,
  sessionStorage: localStorageMock,
  document: mockDocument,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  location: { href: 'http://localhost:3000', hostname: 'localhost', origin: 'http://localhost:3000', search: '' },
  innerWidth: 1920,
  innerHeight: 1080,
  setTimeout: global.setTimeout,
  clearTimeout: global.clearTimeout,
};

