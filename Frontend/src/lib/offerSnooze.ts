/**
 * "Not now" on the backup offer. It lasts a week and ends at the next sign in, so the offer is a
 * quiet question and not something that comes back on every reload. Only a timestamp is kept,
 * on this device. Losing it just means being asked once more.
 */
const KEY = (userId: string) => `selah.offer.${userId}`;
const WEEK = 7 * 86_400_000;

export function snoozeOffer(userId: string) {
  try {
    localStorage.setItem(KEY(userId), String(Date.now()));
  } catch {
    /* storage may be blocked */
  }
}

export function offerSnoozed(userId: string | undefined, now = Date.now()): boolean {
  if (!userId) return false;
  try {
    const at = Number(localStorage.getItem(KEY(userId)));
    return at > 0 && now - at < WEEK;
  } catch {
    return false;
  }
}

export function clearOfferSnooze(userId: string) {
  try {
    localStorage.removeItem(KEY(userId));
  } catch {
    /* nothing to clear */
  }
}
