import { useEffect, useState } from 'react';

/** Add a name here and its picture (public/landing/<name>.webp and .jpg) joins the rotation. */
const PICTURES = ['hero-1', 'hero-2'] as const;
const EVERY_MS = 9000;

const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Pictures along the right edge of the Overview header that fade out toward the left, so the
 * greeting stays clear. They cross-fade slowly and drift. With reduced motion the first one stays still.
 */
export function HeroBackdrop() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setInterval(() => setI((x) => (x + 1) % PICTURES.length), EVERY_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="hero-backdrop" aria-hidden>
      {PICTURES.map((name, n) => (
        <picture key={name}>
          <source srcSet={`/landing/${name}.webp`} type="image/webp" />
          <img className={n === i ? 'is-on' : ''} src={`/landing/${name}.jpg`} alt="" width={1536} height={1024} decoding="async" />
        </picture>
      ))}
    </div>
  );
}
