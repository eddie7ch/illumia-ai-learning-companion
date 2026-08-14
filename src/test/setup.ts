import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// jsdom does not implement scrollIntoView; stub it so components that call it
// (e.g. the auto-scrolling chat) don't throw during tests.
Element.prototype.scrollIntoView = () => {};

afterEach(() => {
  cleanup();
});
