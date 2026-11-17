import { model, Schema } from 'mongoose';
import { RECORD_KINDS } from '@selah/domain';

/** One synced record: a sermon, note, study, highlight or bookmark, for one account. */
const recordSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: RECORD_KINDS, required: true },
    /** The client's id. For highlights and bookmarks this is the canonical verse id. */
    recordId: { type: String, required: true, maxlength: 80 },
    /** Server assigned, increases per account. A pull asks for everything above a rev. */
    rev: { type: Number, required: true },
    doc: { type: Schema.Types.Mixed },
    deleted: { type: Boolean, default: false },
    /** Content removed for good. Only the id and the fact it is gone remain. */
    stub: { type: Boolean, default: false },
  },
  { timestamps: true, minimize: false },
);

recordSchema.index({ userId: 1, kind: 1, recordId: 1 }, { unique: true });
recordSchema.index({ userId: 1, rev: 1 });

export const RecordModel = model('Record', recordSchema);
