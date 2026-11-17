import { AVATAR_MAX_CHARS } from '@selah/domain';

const SIDE = 192;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Turns a chosen picture into a small square JPEG on the device, so only a few kilobytes are ever
 * uploaded and the original never leaves. Throws a sentence the person can act on.
 */
export async function fileToAvatar(file: File): Promise<string> {
  if (!TYPES.includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP picture.');
  if (file.size > 12_000_000) throw new Error('That picture is too large. Choose one under 12 MB.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('That picture could not be read. Try another one.');
  }
  const canvas = document.createElement('canvas');
  canvas.width = SIDE;
  canvas.height = SIDE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot prepare the picture.');
  // Centre crop to a square.
  const s = Math.min(bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, (bitmap.width - s) / 2, (bitmap.height - s) / 2, s, s, 0, 0, SIDE, SIDE);
  bitmap.close();
  for (const q of [0.88, 0.75, 0.6, 0.45]) {
    const url = canvas.toDataURL('image/jpeg', q);
    if (url.length <= AVATAR_MAX_CHARS) return url;
  }
  throw new Error('That picture could not be made small enough. Try another one.');
}
