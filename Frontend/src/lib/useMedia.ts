import { useSyncExternalStore } from 'react';

/** Subscribes to a CSS media query, so layout decisions in JS match the stylesheet. */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => matchMedia(query).matches,
    () => false,
  );
}
