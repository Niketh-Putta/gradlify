import { lazy, type ComponentType } from 'react';

const CHUNK_RELOAD_KEY = 'gradlify:chunk-reload-attempted';

const isChunkLoadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('Expected a JavaScript-or-Wasm module script') ||
    message.includes('MIME type of "text/html"')
  );
};

export function lazyWithRetry<T extends { default: ComponentType<any> }>(
  importer: () => Promise<T>,
) {
  return lazy(async () => {
    try {
      const module = await importer();
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      }
      return module;
    } catch (error) {
      if (
        typeof window !== 'undefined' &&
        isChunkLoadError(error) &&
        window.sessionStorage.getItem(CHUNK_RELOAD_KEY) !== '1'
      ) {
        window.sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
        window.location.reload();
        return new Promise<T>(() => undefined);
      }
      throw error;
    }
  });
}
