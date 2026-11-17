import { useCallback, useState } from 'react';

/** A true or false choice kept on this device, such as whether a side panel is open. Never synced. */
export function useStoredFlag(key: string, initial: boolean): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : raw === '1';
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (v: boolean) => {
      setValue(v);
      try {
        localStorage.setItem(key, v ? '1' : '0');
      } catch {
        /* the choice just is not remembered */
      }
    },
    [key],
  );
  return [value, set];
}
