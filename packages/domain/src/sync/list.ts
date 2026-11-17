export interface ListOptions<T> {
  /** Stable identity of an item, for example a section id. */
  key: (item: T) => string;
  equal: (a: T, b: T) => boolean;
  /**
   * Called when an item exists on both sides, differs between them, and differs from the base on
   * both sides. Returns the merged item, or conflict: true if the two cannot be combined. A
   * conflicted item keeps the local version until the user chooses.
   */
  mergeItem: (base: T | undefined, local: T, remote: T) => { item: T; conflict: boolean };
}

export interface ListResult<T> {
  items: T[];
  /** Keys of items that could not be merged. The local version is in `items`. */
  conflicts: string[];
  /** Keys of items edited on one side and deleted on the other. The edit was kept. */
  keptOverDelete: string[];
}

const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Three way merge of a list of keyed items, comparing local and remote against the last synced
 * base. `base` is null when no base exists (the record was never synced from this device).
 *
 * Rules: an item changed on only one side takes that side. Added on one side: kept. Deleted on
 * one side and untouched on the other: deleted. Deleted on one side and edited on the other: the
 * edit is kept and reported. Order comes from the side that reordered against the base, and if
 * both did, or neither, from the remote (the server's) order.
 */
export function mergeList<T>(base: T[] | null, local: T[], remote: T[], o: ListOptions<T>): ListResult<T> {
  const index = (xs: T[]) => new Map(xs.map((x) => [o.key(x), x] as const));
  const B = index(base ?? []);
  const L = index(local);
  const R = index(remote);

  const survivors = new Map<string, T>();
  const conflicts: string[] = [];
  const keptOverDelete: string[] = [];

  for (const k of new Set([...L.keys(), ...R.keys()])) {
    const b = B.get(k);
    const l = L.get(k);
    const r = R.get(k);
    if (l && r) {
      if (o.equal(l, r)) survivors.set(k, l);
      else if (b && o.equal(l, b)) survivors.set(k, r);
      else if (b && o.equal(r, b)) survivors.set(k, l);
      else {
        const m = o.mergeItem(b, l, r);
        survivors.set(k, m.item);
        if (m.conflict) conflicts.push(k);
      }
    } else if (l) {
      if (!b) survivors.set(k, l); // added on this device
      else if (!o.equal(l, b)) (survivors.set(k, l), keptOverDelete.push(k)); // edited here, deleted there
      // else the remote deleted an item we did not touch: it goes
    } else if (r) {
      if (!b) survivors.set(k, r);
      else if (!o.equal(r, b)) (survivors.set(k, r), keptOverDelete.push(k));
    }
  }

  const keysOf = (xs: T[]) => xs.map(o.key).filter((k) => survivors.has(k));
  const localKeys = keysOf(local);
  const remoteKeys = keysOf(remote);

  // Which side reordered the items all three versions share?
  const stable = (k: string) => B.has(k) && L.has(k) && R.has(k);
  const baseSeq = (base ?? []).map(o.key).filter(stable);
  const movedLocal = !same(local.map(o.key).filter(stable), baseSeq);
  const movedRemote = !same(remote.map(o.key).filter(stable), baseSeq);
  const localLeads = base !== null && movedLocal && !movedRemote;

  const lead = localLeads ? localKeys : remoteKeys;
  const other = localLeads ? remoteKeys : localKeys;
  const order = [...lead];
  // Items only the other side has are placed after the item that preceded them on that side.
  for (let i = 0; i < other.length; i++) {
    const k = other[i]!;
    if (order.includes(k)) continue;
    let at = 0;
    for (let j = i - 1; j >= 0; j--) {
      const p = order.indexOf(other[j]!);
      if (p >= 0) {
        at = p + 1;
        break;
      }
    }
    order.splice(at, 0, k);
  }

  return { items: order.map((k) => survivors.get(k)!), conflicts, keptOverDelete };
}
