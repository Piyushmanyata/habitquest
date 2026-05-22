import { useEffect, useRef, useState } from 'react';

// Tweens a number toward `value`. Cheap rAF-based easing.
export default function AnimatedNumber({ value, className, sign }: { value: number; className?: string; sign?: boolean }) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(0);

  useEffect(() => {
    fromRef.current = shown;
    startRef.current = performance.now();
    const duration = 450;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(fromRef.current + (value - fromRef.current) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const prefix = sign && shown > 0 ? '+' : '';
  return <span className={className}>{prefix}{shown}</span>;
}
