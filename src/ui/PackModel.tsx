import type { CSSProperties, PointerEvent } from 'react';
import { rarities } from '../content/data';
import { PixelArt } from './PixelArt';

export function PackModel({ guarantee = 0 }: { guarantee?: number }) {
  return (
    <div
      className="pack-object"
      style={
        {
          "--rarity": rarities[guarantee].color,
        } as CSSProperties
      }
    >
      <div className={`sealed-pack rarity-${guarantee}`}>
        <i className="pack-seal pack-seal-top" aria-hidden="true" />
        <i className="pack-seal pack-seal-bottom" aria-hidden="true" />
        <span>XCPCard</span>
        <PixelArt kind="trophy" />
        <b>
          ALGORITHM
          <br />
          BOOSTER PACK
        </b>
        <small>5 CARDS / ONE MORE AC</small>
      </div>
    </div>
  );
}

export const packHoverProps = {
  onPointerMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    event.currentTarget.style.setProperty('--pack-x', `${x - 0.5}`);
    event.currentTarget.style.setProperty('--pack-y', `${y - 0.5}`);
    event.currentTarget.style.setProperty('--shine-x', `${x * 100}%`);
    event.currentTarget.style.setProperty('--shine-y', `${y * 100}%`);
  },
  onPointerLeave(event: PointerEvent<HTMLElement>) {
    for (const property of ['--pack-x', '--pack-y', '--shine-x', '--shine-y']) {
      event.currentTarget.style.removeProperty(property);
    }
  },
};
