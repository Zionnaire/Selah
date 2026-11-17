import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

const SLIDES = [
  {
    name: 'hero-1',
    alt: 'SELAH: study deeply, prepare faithfully. An open Bible with light rising from it, and SELAH shown on a laptop, a tablet and a phone.',
  },
  {
    name: 'hero-2',
    alt: 'SELAH: study, prepare, preach with confidence. An open Bible with light rising from it, and SELAH shown on a laptop, a tablet and a phone.',
  },
] as const;

const EVERY_MS = 7000;

const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The opening of the page. The pictures fill the whole hero and change on their own every few
 * seconds. They stop while someone points at them, focuses a control or uses reduced motion, and can
 * always be stepped through by hand. Whatever is passed in sits over the pictures.
 */
export function HeroSlides({ children }: { children: ReactNode }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = (n: number) => setI((n + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    if (paused || prefersReducedMotion()) return;
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), EVERY_MS);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <div
      className="lp-slides"
      role="group"
      aria-roledescription="carousel"
      aria-label="About SELAH"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(i - 1);
        if (e.key === 'ArrowRight') go(i + 1);
      }}
    >
      {SLIDES.map((s, n) => (
        <picture key={s.name} className={`lp-slide${n === i ? ' is-on' : ''}`} aria-hidden={n !== i} role="group" aria-roledescription="slide" aria-label={`${n + 1} of ${SLIDES.length}`}>
          <source srcSet={`/landing/${s.name}.webp`} type="image/webp" />
          <img src={`/landing/${s.name}.jpg`} width={1536} height={1024} alt={n === i ? s.alt : ''} decoding="async" />
        </picture>
      ))}

      <div className="lp-controls">
        <button className="lp-arrow" aria-label="Previous picture" onClick={() => go(i - 1)}>
          <ChevronLeft size={18} aria-hidden />
        </button>
        <div className="lp-dots" role="group" aria-label="Choose a picture">
          {SLIDES.map((s, n) => (
            <button key={s.name} className={n === i ? 'is-on' : ''} aria-label={`Show picture ${n + 1}`} aria-current={n === i} onClick={() => go(n)} />
          ))}
        </div>
        <button className="lp-arrow" aria-label="Next picture" onClick={() => go(i + 1)}>
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>

      {children}
    </div>
  );
}
