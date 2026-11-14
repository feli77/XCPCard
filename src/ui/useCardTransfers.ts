import { useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { Match } from '../game/types';

interface CardSnapshot {
  face: HTMLElement;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  scale: number;
}

function snapshot(element: HTMLElement): CardSnapshot {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return {
    face: element.cloneNode(true) as HTMLElement,
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    width: element.offsetWidth,
    height: element.offsetHeight,
    angle: parseFloat(style.rotate) || 0,
    scale: parseFloat(style.scale) || 1,
  };
}

export function useCardTransfers(match: Match, root: RefObject<HTMLElement | null>) {
  const previous = useRef(match);
  const cards = useRef(new Map<string, CardSnapshot>());
  const deck = useRef<CardSnapshot | null>(null);
  const flights = useRef(new Map<string, () => void>());
  const skipPlay = useRef(false);

  function capture({ skipPlay: skip = false } = {}) {
    skipPlay.current = skip;
    if (!root.current) return;
    cards.current = new Map(Array.from(root.current.querySelectorAll<HTMLElement>('[data-card-uid]'))
      .map(element => [element.dataset.cardUid!, snapshot(element)]));
    const top = root.current.querySelector<HTMLElement>('.deck-pile .pile-layer .pile-card-back')
      ?? root.current.querySelector<HTMLElement>('.deck-pile .pile-stack');
    deck.current = top ? snapshot(top) : null;
  }

  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = match;
    if (before.id === match.id && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const drawn = match.hand.filter(card => !before.hand.some(old => old.uid === card.uid));
      const discarded = match.discard.filter(card => !before.discard.some(old => old.uid === card.uid));
      const played = skipPlay.current ? [] : match.problems.flatMap(problem => problem.table)
        .filter(card => before.hand.some(old => old.uid === card.uid));
      for (const [kind, instances] of [['draw', drawn], ['discard', discarded], ['play', played]] as const) {
        instances.forEach((card, index) => {
          const target = root.current?.querySelector<HTMLElement>(kind === 'discard'
            ? `.discard-pile [data-pile-uid="${CSS.escape(card.uid)}"] .pile-card-back`
            : `[data-card-uid="${CSS.escape(card.uid)}"]`);
          const source = kind === 'draw' ? deck.current : cards.current.get(card.uid);
          if (!target || !source) return;
          flights.current.get(card.uid)?.();
          const destination = snapshot(target);
          const front = kind === 'draw' ? destination.face : source.face;
          const flight = document.createElement('div');
          flight.className = `card-flight card-flight-${kind}`;
          flight.dataset.cardUid = card.uid;
          flight.setAttribute('aria-hidden', 'true');
          flight.inert = true;
          flight.style.width = `${kind === 'draw' ? destination.width : source.width}px`;
          flight.style.height = `${kind === 'draw' ? destination.height : source.height}px`;
          const rotor = document.createElement('div');
          rotor.className = 'card-flight-rotor';
          front.classList.remove('is-dragging', 'selected', 'card-in-transit');
          front.classList.add('card-flight-front');
          front.removeAttribute('data-card-uid');
          rotor.append(front);
          if (kind !== 'play') {
            const back = root.current!.querySelector('.pile-card-back')!.cloneNode(true) as HTMLElement;
            back.classList.remove('card-in-transit');
            back.classList.add('card-flight-back');
            rotor.append(back);
          }
          flight.append(rotor);
          document.body.append(flight);
          target.classList.add('card-in-transit');

          const width = kind === 'draw' ? destination.width : source.width;
          const height = kind === 'draw' ? destination.height : source.height;
          const position = (point: CardSnapshot, lift = 0) =>
            `translate(${point.x - width / 2}px, ${point.y - height / 2 + lift}px) rotate(${point.angle}deg) scale(${point.width / width * point.scale}, ${point.height / height * point.scale})`;
          const duration = kind === 'play' ? 520 : kind === 'draw' ? 760 : 820;
          const timing = { duration, delay: index * 90, fill: 'both' as const,
            easing: kind === 'play' ? 'cubic-bezier(.22,.7,.25,1)' : 'linear' };
          const travel = flight.animate(kind === 'play' ? [
            { transform: position(source) },
            { transform: position(destination) },
          ] : kind === 'draw' ? [
            { transform: position(source), offset: 0, easing: 'cubic-bezier(.22,.7,.25,1)' },
            { transform: position(destination), offset: 0.62 },
            { transform: position(destination), offset: 1 },
          ] : [
            { transform: position(source), offset: 0 },
            { transform: position(source, -12), offset: 0.35, easing: 'cubic-bezier(.45,0,.3,1)' },
            { transform: position(destination, -18), offset: 0.88, easing: 'ease-in' },
            { transform: position(destination), offset: 1 },
          ], timing);
          const flip = kind === 'play' ? null : rotor.animate(kind === 'draw' ? [
            { transform: 'rotateY(180deg)', offset: 0 },
            { transform: 'rotateY(180deg)', offset: 0.62, easing: 'ease-in-out' },
            { transform: 'rotateY(0deg)', offset: 1 },
          ] : [
            { transform: 'rotateY(0deg)', offset: 0, easing: 'ease-in-out' },
            { transform: 'rotateY(180deg)', offset: 0.35 },
            { transform: 'rotateY(180deg)', offset: 1 },
          ], timing);
          const finish = () => {
            travel.cancel();
            flip?.cancel();
            flight.remove();
            target.classList.remove('card-in-transit');
            flights.current.delete(card.uid);
          };
          flights.current.set(card.uid, finish);
          travel.onfinish = finish;
        });
      }
    }
    capture();
  }, [match]);

  useEffect(() => () => {
    flights.current.forEach(finish => finish());
  }, []);

  return capture;
}
