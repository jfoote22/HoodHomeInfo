'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

/**
 * The dashboard is designed pixel-perfect for a fixed 1920x1080 canvas
 * (the kiosk TV target). This wrapper scales that canvas to fit whatever
 * viewport it's actually rendered in - full size on the real TV, scaled
 * down and letterboxed when previewing in a browser window.
 */
export default function ScaleToFit({
  width = 1920,
  height = 1080,
  background,
  children,
}: {
  width?: number;
  height?: number;
  background: string;
  children: ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const recalc = () => {
      const rect = el.getBoundingClientRect();
      const next = Math.min(rect.width / width, rect.height / height);
      setScale(next > 0 ? next : 1);
    };

    recalc();
    const observer = new ResizeObserver(recalc);
    observer.observe(el);
    window.addEventListener('resize', recalc);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recalc);
    };
  }, [width, height]);

  return (
    <div
      ref={outerRef}
      style={{
        width: '100vw',
        height: '100vh',
        background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
