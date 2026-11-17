import { TRANSLATIONS } from '@selah/domain';
import { Download, HardDrive, Monitor, Moon, Sun, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageBar } from '@/app/PageBar';
import type { ThemePref } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import { useApp } from '@/store/app';
import { AccountSection } from '../account/AccountSection';
import { SyncSection } from '../sync/SyncSection';
import { DICTIONARY_SIZE_MB } from '../reference/Reference';
import { ORIGINAL_SIZE_MB } from '../words/InstallCard';

const THEMES: { id: ThemePref; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'Match device', icon: Monitor },
];

const fmtMb = (bytes: number) => `${(bytes / 1_048_576).toFixed(bytes > 1e8 ? 0 : 1)} MB`;

function Appearance() {
  const { pref, setPref } = useTheme();
  return (
    <section className="card">
      <h2 className="card-title">Appearance</h2>
      <p className="muted small setting-note">
        Pulpit Mode has its own theme, chosen when you prepare to preach.
      </p>
      <div className="segmented" role="group" aria-label="Theme">
        {THEMES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-pressed={pref === id}
            onClick={() => setPref(id)}
          >
            <Icon size={15} aria-hidden /> {label}
          </button>
        ))}
      </div>
    </section>
  );
}

function DictionaryRow() {
  const { dictionary, dictProgress, installDictionary, removeDictionary } = useApp();
  const busy = dictionary === 'installing';
  return (
    <ul className="download-list">
      <li>
        <div className="download-main">
          <strong>Bible dictionary</strong>
          <span className="muted small">
            Smith's Bible Dictionary, 1884, public domain. Historic reference. {dictionary === 'ready' ? '' : `About ${DICTIONARY_SIZE_MB} MB.`}
          </span>
          {busy && (
            <div className="progress" role="progressbar" aria-valuenow={Math.round(dictProgress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${Math.max(3, dictProgress * 100)}%` }} />
            </div>
          )}
        </div>
        {dictionary === 'ready' ? (
          <div className="download-actions">
            <span className="chip chip-ok">Offline</span>
            <button className="icon-btn" aria-label="Remove the Bible dictionary from this device" onClick={() => void removeDictionary()}>
              <Trash2 size={16} aria-hidden />
            </button>
          </div>
        ) : (
          <button className="btn btn-sm" disabled={busy || dictionary === 'unknown'} onClick={() => void installDictionary()}>
            <Download size={14} aria-hidden /> {busy ? `${Math.round(dictProgress * 100)}%` : 'Download'}
          </button>
        )}
      </li>
    </ul>
  );
}

function OriginalRow() {
  const { original, originalProgress, installOriginal, removeOriginal } = useApp();
  const busy = original === 'installing';
  return (
    <ul className="download-list">
      <li>
        <div className="download-main">
          <strong>Original languages and lexicon</strong>
          <span className="muted small">
            Hebrew and Greek, word by word, for Word Study.{' '}
            {original === 'ready' ? '' : `About ${ORIGINAL_SIZE_MB} MB.`}
          </span>
          {busy && (
            <div className="progress" role="progressbar" aria-valuenow={Math.round(originalProgress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${Math.max(3, originalProgress * 100)}%` }} />
            </div>
          )}
        </div>
        {original === 'ready' ? (
          <div className="download-actions">
            <span className="chip chip-ok">Offline</span>
            <button className="icon-btn" aria-label="Remove the original language data from this device" onClick={() => void removeOriginal()}>
              <Trash2 size={16} aria-hidden />
            </button>
          </div>
        ) : (
          <button className="btn btn-sm" disabled={busy || original === 'unknown'} onClick={() => void installOriginal()}>
            <Download size={14} aria-hidden /> {busy ? `${Math.round(originalProgress * 100)}%` : 'Download'}
          </button>
        )}
      </li>
    </ul>
  );
}

function OfflineStorage() {
  const { installed, installing, failed, download, remove, db } = useApp();
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);

  useEffect(() => {
    navigator.storage
      ?.estimate()
      .then((e) => setUsage({ used: e.usage ?? 0, quota: e.quota ?? 0 }))
      .catch(() => undefined);
  }, [installed]);

  return (
    <section className="card">
      <h2 className="card-title">Offline storage</h2>
      <p className="muted small setting-note">
        {db?.mode === 'persistent'
          ? 'Translations are stored on this device and open without internet.'
          : 'This browser is not letting SELAH keep data between visits. Close other SELAH tabs or allow storage for this site.'}
      </p>

      {usage && (
        <div className="usage">
          <div className="usage-row">
            <span><HardDrive size={14} aria-hidden /> Used by SELAH</span>
            <strong>{fmtMb(usage.used)}</strong>
          </div>
          <div className="progress" aria-hidden>
            <span style={{ width: `${Math.max(1, (usage.used / Math.max(usage.quota, 1)) * 100)}%` }} />
          </div>
        </div>
      )}

      <ul className="download-list">
        {TRANSLATIONS.map((t) => {
          const have = installed[t.id];
          const progress = installing[t.id];
          const busy = progress !== undefined;
          return (
            <li key={t.id}>
              <div className="download-main">
                <strong>{t.name}</strong>
                <span className="muted small">
                  {t.abbr}, {t.year}. {t.license === 'public-domain' ? 'Public domain' : 'Licensed'}
                  {have ? `. ${have.verseCount.toLocaleString()} verses` : `. About ${t.sizeMb} MB`}
                </span>
                {busy && (
                  <div className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                    <span style={{ width: `${progress * 100}%` }} />
                  </div>
                )}
                {failed[t.id] && <span className="field-error">{failed[t.id]}</span>}
              </div>
              {have ? (
                <div className="download-actions">
                  <span className="chip chip-ok">Offline</span>
                  {!t.bundled && (
                    <button className="icon-btn" aria-label={`Remove ${t.name} from this device`} onClick={() => void remove(t.id)}>
                      <Trash2 size={16} aria-hidden />
                    </button>
                  )}
                </div>
              ) : (
                <button className="btn btn-sm" disabled={busy} onClick={() => void download(t.id)}>
                  <Download size={14} aria-hidden /> {busy ? `${Math.round(progress * 100)}%` : 'Download'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <OriginalRow />
      <DictionaryRow />
      <p className="muted small setting-note">
        SELAH ships public domain translations only. Licensed translations such as the ESV and NIV can be added when a
        licence is in place.
      </p>
    </section>
  );
}

export function Settings() {
  return (
    <>
      <PageBar title="Settings" />
      <div className="page settings-page">
        <AccountSection />
        <SyncSection />
        <Appearance />
        <OfflineStorage />
        <section className="card">
          <h2 className="card-title">About</h2>
          <p className="muted small">SELAH 0.1. Scripture study and sermon preparation that works without internet.</p>
          <p className="small">
            <Link to="/welcome">Welcome page</Link> · <Link to="/privacy" state={{ from: '/settings' }}>Privacy notice</Link> · <Link to="/terms" state={{ from: '/settings' }}>Terms</Link>
          </p>
        </section>
      </div>
    </>
  );
}
