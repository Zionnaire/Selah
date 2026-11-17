interface Props {
  name: string;
  src?: string;
  size?: number;
  className?: string;
}

/** The person's picture, or their initial when they have not set one. */
export function Avatar({ name, src, size, className = '' }: Props) {
  const style = size ? { width: size, height: size } : undefined;
  if (src) return <img className={`avatar avatar-img ${className}`} src={src} alt="" style={style} />;
  return (
    <div className={`avatar ${className}`} aria-hidden style={style}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
