import { events } from '../content/data';
import { highestHonor, medalNames, titleNames } from '../game/honors';
import type { Profile } from '../game/types';
import { AwardBadges } from './AwardBadges';
import { PixelArt } from './PixelArt';

const eventById = Object.fromEntries(events.map(event => [event.id, event]));
const awards = { ...medalNames, ...titleNames };

export function TrophyRoom({ profile }: { profile: Profile }) {
  const best = highestHonor(profile.history);
  return <main className="honors-page">
    <div className="honors-heading">
      <span className="eyebrow">THE TROPHY ROOM</span>
      <h1>成就</h1>
      <p>每一块奖牌，都有一场比赛的故事。</p>
    </div>
    <section className="highest-honor panel" aria-label="最高荣誉">
      <div className="honor-illustration"><PixelArt kind="trophy" /></div>
      <div>
        <span className="eyebrow">最高荣誉</span>
        <h2>{best ? `${best.season} 赛季 ${eventById[best.eventId].name}` : '第一份荣誉，等你带回'}</h2>
        {best ? <>
          <AwardBadges medal={best.medal} title={best.title} />
          <p>第 {best.rank} 名 / {best.teams} 队 · {best.solved} AC · 罚时 {best.penalty}</p>
        </> : <p>参加区域赛、EC-Final、WF、省赛或邀请赛，赢得奖牌与称号。</p>}
      </div>
    </section>
    <section className="honor-stats" aria-label="荣誉统计">
      {Object.entries(awards).map(([key, name]) => <div className={`honor-stat ${key in medalNames ? `medal-${key}` : `title-${key}`}`} key={key} data-award={key}>
        <span>{name}</span>
        <strong>{profile.history.filter(result => result.medal === key || result.title === key).length}</strong>
        <small>累计获得</small>
      </div>)}
    </section>
    <section className="contest-history panel">
      <div className="section-heading"><h3>比赛记录</h3><span>共 {profile.history.length} 场</span></div>
      {profile.history.length ? <div className="history-scroll"><table className="history-table">
        <thead><tr><th>赛季</th><th>赛事</th><th>排名</th><th>AC</th><th>罚时</th><th>荣誉</th><th>奖励</th></tr></thead>
        <tbody>{[...profile.history].reverse().map(result => <tr key={result.matchId}>
          <td>{result.season} 赛季</td>
          <td>{eventById[result.eventId].name}</td>
          <td>#{result.rank} <small>/ {result.teams}</small></td>
          <td>{result.solved}</td><td>{result.penalty}</td>
          <td>{result.medal || result.title ? <AwardBadges medal={result.medal} title={result.title} /> : <span className="honor-muted">完赛</span>}</td>
          <td>{result.packs} 包</td>
        </tr>)}</tbody>
      </table></div> : <p className="empty-copy">还没有比赛记录，完成第一场比赛后会保存在这里。</p>}
    </section>
    <section className="achievements panel">
      <div className="section-heading"><h3>成就系统</h3><span>开发中</span></div>
      <p>未来的成就也会收藏在这里。</p>
    </section>
  </main>;
}
