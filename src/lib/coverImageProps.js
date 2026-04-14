/**
 * HTML img hints for novel covers: first-screen vs below-the-fold.
 * @param {boolean} [priority] true = likely LCP / above the fold (eager + high fetch priority)
 */
export function coverImageProps(priority = false) {
  return priority
    ? { loading: 'eager', decoding: 'async', fetchPriority: 'high' }
    : { loading: 'lazy', decoding: 'async' };
}
