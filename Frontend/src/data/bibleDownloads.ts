import { getTranslation } from '@selah/domain';
import { getDb, proxy } from './client';
import type { BibleBooks } from './types';

/** Fetches a translation file with real byte progress, then imports it into SQLite. */
export async function downloadTranslation(
  id: string,
  onProgress: (fraction: number) => void,
): Promise<void> {
  const info = getTranslation(id);
  if (!info) throw new Error(`Unknown translation ${id}`);
  if (!info.offlineAllowed) throw new Error(`${info.abbr} cannot be stored offline`);

  const res = await fetch(`/bibles/${id}.json`);
  if (!res.ok || !res.body) throw new Error(`Could not download ${info.abbr} (${res.status})`);

  const total = Number(res.headers.get('content-length')) || info.sizeMb * 1_048_576;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    // Download is the first 60 percent of the bar, importing is the rest.
    onProgress(Math.min(0.6, (received / total) * 0.6));
  }

  const text = await new Blob(chunks as BlobPart[]).text();
  const parsed = JSON.parse(text) as { books: BibleBooks };
  await getDb().installTranslation(
    id,
    parsed.books,
    proxy((p: number) => onProgress(0.6 + p * 0.4)),
  );
  onProgress(1);
}
