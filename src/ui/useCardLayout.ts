import { useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

interface SlotPosition {
  element: HTMLElement;
  x: number;
  y: number;
  animation?: Animation;
}

export function useCardLayout(root: RefObject<HTMLElement | null>) {
  const positions = useRef(new Map<string, SlotPosition>());

  useLayoutEffect(() => {
    const next = new Map<string, SlotPosition>();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.current?.querySelectorAll<HTMLElement>('[data-card-slot]').forEach(element => {
      const uid = element.dataset.cardSlot!;
      const previous = positions.current.get(uid);
      const offset = new DOMMatrixReadOnly(getComputedStyle(element).transform);
      const rect = element.getBoundingClientRect();
      const position: SlotPosition = { element, x: rect.x - offset.m41, y: rect.y - offset.m42 };
      if (previous?.element === element && !reducedMotion) {
        position.animation = previous.animation;
        if (Math.abs(previous.x - position.x) > 0.5 || Math.abs(previous.y - position.y) > 0.5) {
          // Continue from the visible position if a second layout change interrupts the move.
          const x = previous.x + offset.m41 - position.x;
          const y = previous.y + offset.m42 - position.y;
          previous.animation?.cancel();
          const animation = element.animate([
            { transform: `translate(${x}px, ${y}px)` },
            { transform: 'translate(0, 0)' },
          ], { duration: 360, easing: 'cubic-bezier(.22,.7,.25,1)' });
          animation.onfinish = () => animation.cancel();
          position.animation = animation;
        }
      } else {
        previous?.animation?.cancel();
      }
      next.set(uid, position);
    });
    positions.current.forEach((position, uid) => {
      if (!next.has(uid)) position.animation?.cancel();
    });
    positions.current = next;
  });

  useEffect(() => () => {
    positions.current.forEach(position => position.animation?.cancel());
  }, []);
}
