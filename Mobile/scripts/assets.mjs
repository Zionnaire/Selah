// Copies the bundled Bible text from the web app's public folder, so the two always ship the same text.
// The files are generated data (see pnpm bible:ingest at the repository root) and are not committed here.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const from = join(here, '..', '..', 'Frontend', 'public', 'bibles');
const to = join(here, '..', 'assets', 'data');
mkdirSync(to, { recursive: true });

// The King James Version is bundled so the reader works on the first launch with no network.
// It is copied under a data extension, not .json, so the bundler packs it as a file and does not
// inline 4 MB of text into the JavaScript, which the phone's engine would have to compile.
for (const name of ['kjv']) {
  const src = join(from, `${name}.json`);
  if (!existsSync(src)) throw new Error(`${src} is missing. Run pnpm bible:ingest at the repository root first.`);
  copyFileSync(src, join(to, `${name}.bible`));
}
console.log('bible data copied');
