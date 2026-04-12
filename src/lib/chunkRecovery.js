/**
 * After a new deploy, the browser may still run an old JS shell that references
 * deleted hashed chunks → 404 + "Failed to fetch dynamically imported module".
 * Retrying the same URL never fixes that; we need a full reload to fetch fresh index.html.
 *
 * At most one automatic hard reload per browser tab (sessionStorage survives reload).
 * User can still hard-refresh or close the tab for another attempt.
 */
const SESSION_KEY = 'mitruyen_chunk_recovery_reload_done';

export function isChunkOrModuleLoadError(err) {
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

/** @returns {boolean} true if a full reload was triggered (caller should not throw yet / hang) */
export function tryHardReloadOnceForStaleChunks() {
  try {
    if (sessionStorage.getItem(SESSION_KEY) === '1') return false;
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}
