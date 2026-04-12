import { lazy } from 'react';
import { isChunkOrModuleLoadError, tryHardReloadOnceForStaleChunks } from './chunkRecovery';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const hang = () => new Promise(() => {});

/**
 * Wraps React.lazy: retries transient network errors, then one full reload for stale
 * post-deploy chunks (404 on hashed files). See chunkRecovery.js.
 */
export function lazyWithRetry(factory, { retries = 2, delayMs = 350 } = {}) {
  return lazy(async () => {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await factory();
      } catch (err) {
        lastErr = err;
        if (!isChunkOrModuleLoadError(err) || attempt === retries) break;
        await sleep(delayMs * (attempt + 1));
      }
    }
    if (isChunkOrModuleLoadError(lastErr) && tryHardReloadOnceForStaleChunks()) {
      await hang();
    }
    throw lastErr;
  });
}
