import { useApp } from '@/store/app';

export function Boot() {
  const { phase, bootLabel, bootProgress, error } = useApp();
  return (
    <div className="boot" role="status">
      <div className="boot-inner">
        <img src="/brand/selah-symbol-gold.svg" alt="" />
        <h1>SELAH</h1>
        {phase === 'error' ? (
          <>
            <p>SELAH could not open your library. {error}</p>
            <button className="btn btn-on-navy" onClick={() => location.reload()}>
              Try again
            </button>
          </>
        ) : (
          <>
            <div className="progress" aria-hidden>
              <span style={{ width: `${Math.max(4, bootProgress * 100)}%` }} />
            </div>
            <p>{bootLabel}. This happens once and then works without internet.</p>
          </>
        )}
      </div>
    </div>
  );
}
