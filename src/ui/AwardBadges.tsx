import { medalNames, titleNames } from '../game/honors';
import type { Medal, PodiumTitle } from '../game/types';

export function AwardBadges({ medal, title }: { medal: Medal | null; title: PodiumTitle | null }) {
  return <span className="award-badges">
    {title && <span className={`award-badge title-${title}`}>★ {titleNames[title]}</span>}
    {medal && <span className={`award-badge medal-${medal}`}>● {medalNames[medal]}</span>}
  </span>;
}
