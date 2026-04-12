import { lazy } from 'react';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isChunkLoadError(err) {
  if (!err) return false;
  const msg = String(err.message || err);
  return (
    err.name === 'ChunkLoadError' ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  );
}

/**
 * Wraps React.lazy so a flaky network / stale deploy chunk load is retried before failing.
 * Reduces blank screens when navigating between code-split routes.
 */
export function lazyWithRetry(factory, { retries = 2, delayMs = 350 } = {}) {
  return lazy(async () => {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await factory();
      } catch (err) {
        lastErr = err;
        if (!isChunkLoadError(err) || attempt === retries) break;
        await sleep(delayMs * (attempt + 1));
      }
    }
    throw lastErr;
  });
}
