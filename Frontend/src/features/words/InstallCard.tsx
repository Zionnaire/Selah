import { ORIGINAL_ATTRIBUTION } from '@selah/domain';
import { Download, Languages, TriangleAlert } from 'lucide-react';
import { useApp } from '@/store/app';

export const ORIGINAL_SIZE_MB = 24;

/** Shown wherever Word Study is needed but its data is not on the device yet. */
export function InstallCard() {
  const { original, originalProgress, originalError, installOriginal } = useApp();
  const busy = original === 'installing';
  return (
    <div className="card install-card">
      <div className="empty">
        <div className="empty-icon">
          <Languages size={20} aria-hidden />
        </div>
        <h3>Word Study needs the original language data</h3>
        <p>
          It is a one time download of about {ORIGINAL_SIZE_MB} MB: every Hebrew and Greek word in the Bible with its
          dictionary entry. After that it works without internet.
        </p>
        {busy && (
          <div className="progress" style={{ width: '100%', maxWidth: 360 }} role="progressbar" aria-valuenow={Math.round(originalProgress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${Math.max(3, originalProgress * 100)}%` }} />
          </div>
        )}
        {original === 'failed' && (
          <p className="field-error">
            <TriangleAlert size={14} aria-hidden /> {originalError}
          </p>
        )}
        <div className="actions">
          <button className="btn btn-primary" onClick={() => void installOriginal()} disabled={busy}>
            <Download size={16} aria-hidden /> {busy ? `Downloading ${Math.round(originalProgress * 100)}%` : original === 'failed' ? 'Try again' : 'Download'}
          </button>
        </div>
        <p className="muted small">{ORIGINAL_ATTRIBUTION}</p>
      </div>
    </div>
  );
}
