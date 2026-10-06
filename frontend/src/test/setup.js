import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom n'implémente pas le défilement (utilisé par <ScrollRestoration />).
window.scrollTo = () => {};

afterEach(() => {
  cleanup();
  localStorage.clear();
});
