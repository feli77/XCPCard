import { useEffect, useRef, useState } from 'react';
import { PixelArt } from './PixelArt';

export function TrainingPoints({ amount }: { amount: number | string }) {
  return <span className="training-points" title="训练点" aria-label={`${amount} 训练点`}>
    <PixelArt kind="training-point" />
    <span>{amount}</span>
  </span>;
}

export function TrainingBalance({ amount }: { amount: number }) {
  const previous = useRef(amount);
  const [change, setChange] = useState<{ amount: number; id: number } | null>(null);
  const sequence = useRef(0);
  useEffect(() => {
    if (amount !== previous.current) setChange({ amount: amount - previous.current, id: ++sequence.current });
    previous.current = amount;
  }, [amount]);
  useEffect(() => {
    if (!change) return;
    const timer = window.setTimeout(() => setChange(null), 1300);
    return () => window.clearTimeout(timer);
  }, [change]);
  return <span className="training-balance">
    <span key={change?.id ?? 'balance'} className={change ? 'training-balance-pop' : undefined}>
      <TrainingPoints amount={amount} />
    </span>
    {change && <span key={`change-${change.id}`} className={`training-change ${change.amount > 0 ? 'positive' : 'negative'}`} role="status" aria-label={`${change.amount > 0 ? '+' : ''}${change.amount} 训练点`}>
      {change.amount > 0 ? '+' : ''}{change.amount}
    </span>}
  </span>;
}
