import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom n'implémente pas le défilement (utilisé par <ScrollRestoration /> et l'assistant IA).
window.scrollTo = () => {};
Element.prototype.scrollTo ??= () => {};

// Aucun test n'appelle la vraie API : par défaut, une requête reste « en cours ».
// Un test fournit ses réponses avec vi.mocked(httpClient.get).mockResolvedValue(...).
vi.mock('@/shared/api/httpClient', () => {
  const pending = () => new Promise(() => {});
  return {
    httpClient: {
      get: vi.fn(pending),
      post: vi.fn(pending),
      put: vi.fn(pending),
      patch: vi.fn(pending),
      delete: vi.fn(pending),
    },
    onSessionExpired: () => () => {},
  };
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});
