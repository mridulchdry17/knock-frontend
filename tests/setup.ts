import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Node 22+ ships a built-in webstorage that vitest's jsdom env can collide with.
// Force a plain in-memory localStorage / sessionStorage on every test so the
// usual API (clear/getItem/setItem) is reliable.
function makeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? (map.get(key) as string) : null;
    },
    key(i: number) {
      return Array.from(map.keys())[i] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

beforeEach(() => {
  Object.defineProperty(window, "localStorage", { configurable: true, value: makeStorage() });
  Object.defineProperty(window, "sessionStorage", { configurable: true, value: makeStorage() });
});

afterEach(() => {
  cleanup();
});

// jsdom doesn't implement matchMedia. Provide a stub each test can override.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
