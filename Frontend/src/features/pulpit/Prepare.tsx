import { TRANSLATIONS, formatReference, type PassageRef, type Sermon } from '@selah/domain';
import { ArrowLeft, BatteryMedium, BellOff, Check, ChevronDown, Lectern, MonitorSmartphone, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { PageBar } from '@/app/PageBar';
import { useApp } from '@/store/app';
import { useReader } from '@/store/reader';
import { useScriptureTexts } from '../sermons/hooks';
import { sermonRepo } from '../sermons/repo';
import { pulpitFontSize, usePulpitPrefs } from './prefs';

const THEMES = [
  { id: 'dark', label: 'Dark' },
  { id: 'warm', label: 'Warm' },
  { id: 'light', label: 'Light' },
] as const;

interface BatteryManager {
  level: number;
  charging: boolean;
}

function useBattery() {
  const [b, setB] = useState<BatteryManager | null>(null);
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> };
    void nav.getBattery?.().then(setB).catch(() => undefined);
  }, []);
  return b;
}

export function PulpitPrepare() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const prefs = usePulpitPrefs();
  const installed = useApp((s) => s.installed);
  const pref = useReader((s) => s.translation);
  const setTranslation = useReader((s) => s.setTranslation);
  const translation = installed[pref] ? pref : (Object.keys(installed)[0] ?? 'kjv');
  const battery = useBattery();
  const wakeSupported = 'wakeLock' in navigator;

  const [sermon, setSermon] = useState<Sermon | null | undefined>(undefined);
  useEffect(() => {
    void sermonRepo.load(id).then(setSermon);
  }, [id]);

  const refs: PassageRef[] = useMemo(
    () => (sermon?.sections ?? []).flatMap((s) => s.blocks.flatMap((b) => (b.type === 'scripture' ? [b.ref] : []))),
    [sermon],
  );
  const { texts, keyOf } = useScriptureTexts(refs, translation);

  if (sermon === null) return <Navigate to="/pulpit" replace />;
  if (!sermon) return <div className="page"><div className="skeleton" style={{ height: 260 }} aria-busy="true" /></div>;

  const missing = refs.filter((r) => texts[keyOf(r)] && texts[keyOf(r)]!.length === 0);
  const empty = sermon.sections.every((s) => s.blocks.length === 0);
  const abbr = TRANSLATIONS.find((t) => t.id === translation)?.abbr ?? translation;

  return (
    <>
      <PageBar title="Prepare for pulpit" />
      <div className="page prepare">
        <Link to={`/sermons/${id}`} className="back-link">
          <ArrowLeft size={15} aria-hidden /> Back to the sermon
        </Link>
        <h2 className="page-title">{sermon.title}</h2>
        <p className="muted lead">
          {sermon.passage && <span className="ref">{formatReference(sermon.passage)}</span>}
          {sermon.passage && ' · '}
          {sermon.sections.length} sections · {sermon.targetMinutes} minutes
        </p>

        {empty && (
          <p className="notice warn">
            <TriangleAlert size={16} aria-hidden /> This sermon has nothing written yet. You can still enter, but there will be nothing to read.
          </p>
        )}

        <div className="prepare-grid">
          <section className="card">
            <h3 className="card-title">Checks</h3>
            <ul className="checks">
              <li className="is-ok">
                <Check size={16} aria-hidden />
                <div>
                  <strong>Offline copy ready</strong>
                  <span className="muted small">The sermon and the Scripture in {abbr} are on this device. No signal needed.</span>
                </div>
              </li>
              {missing.length > 0 && (
                <li className="is-warn">
                  <TriangleAlert size={16} aria-hidden />
                  <div>
                    <strong>{missing.length} passage{missing.length === 1 ? '' : 's'} not found in {abbr}</strong>
                    <span className="muted small">{missing.map((r) => formatReference(r)).join(', ')}. Try another translation.</span>
                  </div>
                </li>
              )}
              <li>
                <MonitorSmartphone size={16} aria-hidden />
                <div>
                  <strong>Keep the screen awake</strong>
                  <span className="muted small">{wakeSupported ? 'The screen stays on while you preach.' : 'This browser cannot do this. Set a long screen timeout instead.'}</span>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={prefs.keepAwake && wakeSupported} disabled={!wakeSupported} onChange={(e) => prefs.set({ keepAwake: e.target.checked })} aria-label="Keep the screen awake" />
                  <span aria-hidden />
                </label>
              </li>
              <li>
                <BellOff size={16} aria-hidden />
                <div>
                  <strong>Do Not Disturb</strong>
                  <span className="muted small">A web app cannot turn this on. Switch it on in your device settings.</span>
                </div>
              </li>
              {battery && (
                <li className={battery.level < 0.3 && !battery.charging ? 'is-warn' : undefined}>
                  <BatteryMedium size={16} aria-hidden />
                  <div>
                    <strong>Battery {Math.round(battery.level * 100)}%</strong>
                    <span className="muted small">{battery.charging ? 'Charging.' : battery.level < 0.3 ? 'Low. Plug in before you start.' : 'Enough for a long service.'}</span>
                  </div>
                </li>
              )}
            </ul>
          </section>

          <section className="card">
            <h3 className="card-title">Appearance</h3>
            <div className="theme-choices" role="radiogroup" aria-label="Pulpit theme">
              {THEMES.map((t) => (
                <button key={t.id} role="radio" aria-checked={prefs.theme === t.id} className={`theme-swatch swatch-${t.id}`} onClick={() => prefs.set({ theme: t.id })}>
                  <span>Aa</span>
                  {t.label}
                </button>
              ))}
            </div>

            <div className={`pulpit-sample swatch-${prefs.theme}`} style={{ fontSize: pulpitFontSize(prefs.textStep) }}>
              The word of the Lord endures forever.
            </div>
            <div className="row-between">
              <span className="muted small">Text size</span>
              <div className="segmented">
                <button onClick={() => prefs.set({ textStep: Math.max(-2, prefs.textStep - 1) })} aria-label="Smaller text">A-</button>
                <button onClick={() => prefs.set({ textStep: Math.min(6, prefs.textStep + 1) })} aria-label="Larger text">A+</button>
              </div>
            </div>

            <div className="row-between">
              <span className="muted small">Translation</span>
              <label className="select">
                <span className="sr-only">Translation</span>
                <select value={translation} onChange={(e) => setTranslation(e.target.value)}>
                  {Object.keys(installed).map((tid) => (
                    <option key={tid} value={tid}>{TRANSLATIONS.find((t) => t.id === tid)?.abbr ?? tid}</option>
                  ))}
                </select>
                <ChevronDown size={15} aria-hidden />
              </label>
            </div>

            <div className="row-between">
              <span className="muted small">Start in</span>
              <div className="segmented" role="group" aria-label="Start mode">
                {(['manuscript', 'outline'] as const).map((m) => (
                  <button key={m} aria-pressed={prefs.startMode === m} onClick={() => prefs.set({ startMode: m })}>
                    {m === 'manuscript' ? 'Manuscript' : 'Outline'}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="form-actions">
          <button className="btn btn-gilt btn-lg" onClick={() => navigate(`/pulpit/${id}/live`)}>
            <Lectern size={18} aria-hidden /> Enter Pulpit
          </button>
        </div>
      </div>
    </>
  );
}
