import { model, Schema } from 'mongoose';

/** One per account. The counter is incremented inside the push transaction, which serialises writers. */
const syncStateSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  /** The last rev handed out. */
  lastRev: { type: Number, default: 0 },
  /**
   * Deletion markers at or below this rev may have been pruned. A device whose cursor is older
   * than this must do a full reconcile instead of a delta.
   */
  horizonRev: { type: Number, default: 0 },
});

export const SyncStateModel = model('SyncState', syncStateSchema);
