import { useLayoutEffect, useRef, useState } from 'react';
import { MATCH_DURATION } from '../game/engine';

export function ContestCountdown({ time }: { time: number }) {
  const frame = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const remaining = Math.max(0, MATCH_DURATION - time);
  const elapsed = (MATCH_DURATION - remaining) / MATCH_DURATION * 1000;
  const urgency = remaining <= 30 ? 'critical' : remaining <= 60 ? 'warning' : 'normal';

  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(frame.current!);
    return () => observer.disconnect();
  }, []);

  return <svg ref={frame} className={`contest-countdown ${urgency}`} aria-hidden="true">
    {size.width > 0 && <path
      d={`M ${size.width / 2} 5 H ${size.width - 5} V ${size.height - 5} H 5 V 5 Z`}
      fill="none"
      stroke="currentColor"
      strokeWidth="10"
      pathLength="1000"
      strokeDasharray={`${1000 - elapsed} 1000`}
      strokeDashoffset={-elapsed}
    />}
  </svg>;
}
