/**
 * Structural equality for plain data (what we store as JSON). Key order does not matter and a
 * property set to undefined is the same as a missing one, so a save that changes nothing is
 * never mistaken for an edit.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  const ra = a as Record<string, unknown>;
  const rb = b as Record<string, unknown>;
  const ak = Object.keys(ra).filter((k) => ra[k] !== undefined);
  const bk = Object.keys(rb).filter((k) => rb[k] !== undefined);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => deepEqual(ra[k], rb[k]));
}

/** A change only counts if the content differs from the last synced version. */
export const isEdit = (base: unknown, current: unknown): boolean => !deepEqual(base, current);
