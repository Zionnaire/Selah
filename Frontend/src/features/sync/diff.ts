export interface Piece {
  text: string;
  changed: boolean;
}

const MAX_TOKENS = 1500;

/**
 * Compares two texts by word so a conflict shows what differs, not just that something does.
 * Returns both sides with the words that are not in the other side marked. Very long texts are
 * shown plain, since the comparison grows with the product of the lengths.
 */
export function diffWords(a: string, b: string): { left: Piece[]; right: Piece[] } {
  const x = a.split(/(\s+)/).filter(Boolean);
  const y = b.split(/(\s+)/).filter(Boolean);
  if (x.length > MAX_TOKENS || y.length > MAX_TOKENS) {
    return { left: [{ text: a, changed: false }], right: [{ text: b, changed: false }] };
  }
  // Longest common subsequence of words, then walk it.
  const n = x.length;
  const m = y.length;
  const table: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i]![j] = x[i] === y[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }
  const left: Piece[] = [];
  const right: Piece[] = [];
  const push = (list: Piece[], text: string, changed: boolean) => {
    const last = list[list.length - 1];
    if (last && last.changed === changed) last.text += text;
    else list.push({ text, changed });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) {
      push(left, x[i]!, false);
      push(right, y[j]!, false);
      i++;
      j++;
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) {
      push(left, x[i++]!, !/^\s+$/.test(x[i - 1]!));
    } else {
      push(right, y[j++]!, !/^\s+$/.test(y[j - 1]!));
    }
  }
  while (i < n) push(left, x[i++]!, !/^\s+$/.test(x[i - 1]!));
  while (j < m) push(right, y[j++]!, !/^\s+$/.test(y[j - 1]!));
  return { left, right };
}
