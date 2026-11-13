import type { CSSProperties } from 'react';
import { canSubmit, cardById, standings, tableScore } from '../game/engine';
import type { Action, Match, Standing } from '../game/types';
import { Card } from './Card';
import { ContestCountdown } from './ContestCountdown';
import { PixelArt } from './PixelArt';
import { useCardDrag } from './useCardDrag';

interface MatchViewProps {
  match: Match;
  viewProblem: number;
  selected: string[];
  onCommand: (action: Action) => void;
  onChooseProblem: (index: number) => void;
  onToggleSelected: (uid: string) => void;
  onTogglePause: () => void;
}

const timeText = (value: number) =>
  `${Math.floor(value / 60).toString().padStart(2, '0')}:${Math.floor(value % 60).toString().padStart(2, '0')}`;

export function MatchView({
  match, viewProblem, selected,
  onCommand, onChooseProblem, onToggleSelected, onTogglePause,
}: MatchViewProps) {
  const leaderboard = standings(match);
  const player = leaderboard.find(team => team.player)!;
  const problem = match.problems[viewProblem];
  const read = problem.readProgress >= problem.readTime;
  const score = tableScore(match, viewProblem);
  const ready = canSubmit(match, viewProblem);
  const reserved = new Set(match.pendingActions.flatMap(action =>
    action.type === 'play' || action.type === 'discard-hand' ? action.uids : []));
  const availableSelected = selected.filter(uid => !reserved.has(uid));
  const submitDisabled = match.paused
    ? !problem.table.length && !match.pendingActions.some(action => action.type === 'play' && action.problem === viewProblem)
    : !ready || viewProblem !== match.currentProblem;

  const { dragged, startDrag, onClickCapture, onPointerDownCapture } = useCardDrag<{
    from: 'hand' | 'table'; uid: string; uids: string[];
  }>((transfer, target) => {
    const uids = transfer.from === 'hand' ? transfer.uids.filter(uid => !reserved.has(uid)) : transfer.uids;
    if (!uids.length) return;
    if (target === 'table' && transfer.from === 'hand' && read && problem.acTime === null) {
      onCommand({ type: 'play', uids, problem: viewProblem });
    } else if (target === 'discard') {
      onCommand(transfer.from === 'hand'
        ? { type: 'discard-hand', uids }
        : { type: 'discard-table', uids, problem: viewProblem });
    }
  });

  return <main className="match-page" onClickCapture={onClickCapture} onPointerDownCapture={onPointerDownCapture}>
    <ContestCountdown time={match.time}/>
    <div className="match-toolbar">
      <div className="clock-block">
        <span className="tiny-label">CONTEST TIME</span>
        <strong>{timeText(match.time)}<small> / 05:00</small></strong>
        <span className="clock-minutes">{Math.floor(match.time)} / 300 比赛分钟</span>
      </div>
      <div className="contest-progress"><span style={{ width: `${match.time / 3}%` }}/></div>
      <div className="global-effects">
        {match.globalEffects.coffee && <span>☕ 咖啡 {Math.ceil(match.globalEffects.coffee.expiresAt - match.time)}′</span>}
        {match.globalEffects.draw && <span>♫ 曲谱 {Math.ceil(match.globalEffects.draw.expiresAt - match.time)}′</span>}
      </div>
      <div className="player-record">
        <b>{player.solved}<span> AC</span></b>
        <small>#{player.rank} / {leaderboard.length}</small>
      </div>
      <button
        className={match.paused ? 'primary pause-button' : 'secondary pause-button'}
        disabled={match.status === 'finished'}
        onClick={onTogglePause}
      >
        {match.paused ? '▶ 继续比赛' : 'Ⅱ 暂停'}
      </button>
    </div>

    <div className="arena">
      <ProblemMenu match={match} viewProblem={viewProblem} onChoose={onChooseProblem}/>
      <section
        className={`table-panel ${match.feedback?.problem === viewProblem ? `feedback-${match.feedback.result}` : ''}`}
        data-card-drop="table"
      >
        <div className="problem-heading">
          <span className="problem-letter">{problem.label}</span>
          <div>
            <h2>{problem.name}</h2>
            <p>{read ? <>
              {problem.categories.map(category => <span className="category-tag" key={category}>{category}</span>)}
              <span className="difficulty">难度 <b>{problem.difficulty}</b></span>
            </> : '读完题面，才能知道评测机在想什么。'}</p>
          </div>
          <span className="table-caption">PROBLEM DESK</span>
        </div>

        {problem.acTime !== null ? <div className="solved-desk">
          <div className="ac-stamp">ACCEPTED</div>
          <div className="balloons"><i/><i/><i/></div>
          <h3>过了，别碰它。</h3>
          <p>{Math.floor(problem.acTime)} 分钟 · {problem.attempts.filter(attempt => attempt.result === 'WA').length} 次 WA</p>
          <span>看看下一道题？</span>
        </div> : !read ? <div className="reading-desk">
          <PixelArt kind="template"/>
          <span className="eyebrow">READING PROBLEM {problem.label}</span>
          <h3>{problem.readProgress === 0 ? '先读题，再谈人生。' : '正在努力理解小明……'}</h3>
          <div className="reading-progress"><span style={{ width: `${problem.readProgress / problem.readTime * 100}%` }}/></div>
          <p>
            {Math.floor(problem.readProgress)} / {problem.readTime} 比赛分钟
            {match.paused ? ' · 已暂停' : viewProblem !== match.currentProblem ? ' · 等待切入' : ''}
          </p>
        </div> : <>
          <div className="score-strip">
            <div><span>场面分数</span><strong>{score.toLocaleString()}</strong></div>
            <div className="score-target"><span>题目难度</span><b>{problem.difficulty.toLocaleString()}</b></div>
            <div className="score-note">
              {problem.waRevision === problem.revision ? '改变牌桌构成后可再次提交'
                : problem.table.length ? `${problem.table.filter(card => card.active).length} / ${problem.table.length} 张已生效`
                : '选择手牌，加入这道题的思路'}
            </div>
          </div>
          <div className={`table-cards ${!problem.table.length ? 'empty' : ''}`}>
            {problem.table.length ? problem.table.map(instance => {
              const card = cardById[instance.cardId];
              const scoreGain = card.type === 'algorithm'
                ? card.score * (card.categories.some(category => problem.categories.includes(category)) ? 1 : 0.5)
                : instance.dice;
              return <Card
                key={instance.uid}
                card={card}
                active={instance.active}
                progress={instance.duration ? instance.progress / instance.duration : 0}
                dice={instance.dice}
                scoreGain={scoreGain}
                draggable
                dragging={dragged?.from === 'table' && dragged.uid === instance.uid}
                onPointerDown={event => startDrag(event, { from: 'table', uid: instance.uid, uids: [instance.uid] })}
                onDiscard={() => onCommand({ type: 'discard-table', uids: [instance.uid], problem: viewProblem })}
              />;
            }) : <div className="empty-table">
              <span>＋</span><p>把思路放上来</p><small>点击手牌多选后出牌，或拖到这里</small>
            </div>}
          </div>
          <div className="table-bottom">
            <span>
              {problem.submitQueued ? '◷ 已预约提交'
                : problem.attempts.length ? `提交记录 ${problem.attempts.map(attempt => `${attempt.result} ${Math.floor(attempt.time)}′`).join(' · ')}`
                : '卡牌依次生效，全部就绪后可提交。'}
            </span>
            <button
              className="primary submit-button"
              disabled={submitDisabled}
              onClick={() => onCommand({ type: 'submit', problem: viewProblem })}
            >
              {match.paused ? '预约提交' : '提交'} <span>↵</span>
            </button>
          </div>
        </>}

        {match.feedback?.problem === viewProblem && <div key={match.feedback.id} className={`judge-toast ${match.feedback.result}`}>
          <b>{match.feedback.result}</b><span>{match.feedback.text}</span>
        </div>}
      </section>
      <LiveRanking match={match} rows={leaderboard} onChoose={onChooseProblem}/>
    </div>

    <section className="hand-panel">
      <div className="hand-heading">
        <h3>共享手牌 <span>{match.hand.length} / 8</span></h3>
        <div>
          <span>牌库 {match.deck.length}</span>
          <span>下张 {match.hand.length === 8 ? '满手暂停' : `${Math.max(0, (match.globalEffects.draw?.interval || 4) - match.drawProgress).toFixed(0)}′`}</span>
        </div>
        <span className="hand-selection">{availableSelected.length ? `已选 ${availableSelected.length} 张` : '点击多选 · 拖放出牌'}</span>
        <div className="hand-actions">
          <button
            className="secondary"
            disabled={!availableSelected.length}
            onClick={() => onCommand({ type: 'discard-hand', uids: availableSelected })}
          >
            {match.paused ? '预排弃牌' : '弃牌'}
          </button>
          <button
            className="primary"
            disabled={!availableSelected.length || !read || problem.acTime !== null}
            onClick={() => onCommand({ type: 'play', uids: availableSelected, problem: viewProblem })}
          >
            {match.paused ? '预排出牌' : '出牌'} →
          </button>
        </div>
      </div>
      <div className="hand-cards">
        <div className="hand-fan" style={{ '--hand-count': Math.max(1, match.hand.length) } as CSSProperties}>
          {match.hand.map((instance, index) => {
            const isReserved = reserved.has(instance.uid);
            const movingTogether = dragged?.from === 'hand' && dragged.uid !== instance.uid && dragged.uids.includes(instance.uid);
            const offset = index - (match.hand.length - 1) / 2;
            return <div
              key={instance.uid}
              className={`hand-card-slot ${isReserved ? 'is-reserved' : ''} ${movingTogether ? 'drag-companion' : ''}`}
              style={{ '--fan-angle': `${offset * 2.5}deg`, '--fan-drop': `${offset * offset * 1.8}px` } as CSSProperties}
            >
              <Card
                card={cardById[instance.cardId]}
                selected={!isReserved && selected.includes(instance.uid)}
                onClick={isReserved ? undefined : () => onToggleSelected(instance.uid)}
                draggable={!isReserved}
                dragging={dragged?.from === 'hand' && dragged.uid === instance.uid}
                onPointerDown={isReserved ? undefined : event => startDrag(event, {
                  from: 'hand', uid: instance.uid,
                  uids: availableSelected.includes(instance.uid) ? availableSelected : [instance.uid],
                })}
              />
              {isReserved && <span className="reserved-label">已预排</span>}
            </div>;
          })}
          {!match.hand.length && <div className="empty-hand">思路暂时用完了，下一张正在路上。</div>}
        </div>
        <div
          className="discard-pile"
          data-card-drop="discard"
        >
          <span>↧</span><b>{match.discard.length}</b><small>弃牌堆</small><i>拖到这里弃牌</i>
        </div>
      </div>
    </section>
    {match.pendingActions.length > 0 && <PendingActions match={match}/>}
  </main>;
}

function ProblemMenu({ match, viewProblem, onChoose }: {
  match: Match;
  viewProblem: number;
  onChoose: (index: number) => void;
}) {
  return <aside className="problems-panel">
    <div className="section-heading"><h3>题目</h3><span>{match.problems.length}</span></div>
    <div className="problem-list">
      {match.problems.map((problem, index) => {
        const known = problem.readProgress >= problem.readTime;
        const ac = problem.acTime !== null;
        return <button
          key={problem.id}
          className={`problem-button ${viewProblem === index ? 'current' : ''} ${ac ? 'solved' : ''}`}
          onClick={() => onChoose(index)}
        >
          <b>{problem.label}</b>
          <span>
            <strong>{problem.name}</strong>
            <small>{ac ? `AC · ${Math.floor(problem.acTime!)}′`
              : known ? `${problem.difficulty} · ${problem.categories.join(' / ')}`
              : problem.readProgress > 0 ? `阅读中 ${Math.floor(problem.readProgress)}/${problem.readTime}′`
              : '题面未读'}</small>
          </span>
          <i>{ac ? '✓' : known ? '·' : '?'}</i>
        </button>;
      })}
    </div>
  </aside>;
}

function LiveRanking({ match, rows, onChoose }: {
  match: Match;
  rows: Standing[];
  onChoose: (index: number) => void;
}) {
  return <aside className="leaderboard-panel">
    <div className="section-heading"><h3>实时榜</h3><span>LIVE <i className="live-dot"/></span></div>
    <div className="rank-scroll">
      <table className="rank-table">
        <thead><tr><th># / 队伍</th><th>AC</th><th>罚时</th></tr></thead>
        <tbody>
          {rows.map(team => <tr key={team.id} className={team.player ? 'you' : ''}>
            <td>
              <div className="team-title">
                <b>{team.rank.toString().padStart(2, '0')}</b>
                <span>{team.name}{team.player && <i>YOU</i>}</span>
              </div>
              <div className="team-problems">
                {team.problems.map((problem, index) => <button
                  key={index}
                  title={`${match.problems[index].label} · ${problem.result || '未提交'}${problem.attempts ? ` · ${problem.attempts} 次提交` : ''}`}
                  className={problem.result || ''}
                  onClick={() => onChoose(index)}
                >
                  {match.problems[index].label}
                </button>)}
              </div>
            </td>
            <td><b>{team.solved}</b></td>
            <td>{Math.floor(team.penalty)}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <div className="rank-legend"><span>■ AC</span><span>■ WA</span><small>看大家在过哪题，也是一种算法。</small></div>
  </aside>;
}

function PendingActions({ match }: { match: Match }) {
  function description(action: Action) {
    switch (action.type) {
      case 'switch': return `切到 ${match.problems[action.problem].label}`;
      case 'play': return `向 ${match.problems[action.problem ?? match.currentProblem].label} 出 ${action.uids.length} 张`;
      case 'submit': return `预约 ${match.problems[action.problem ?? match.currentProblem].label} 提交`;
      case 'discard-hand':
      case 'discard-table': return `弃 ${action.uids.length} 张`;
    }
  }
  return <div className="pending-strip">
    <b>预排</b>
    {match.pendingActions.map((action, index) => <span key={index}>{index + 1}. {description(action)}</span>)}
  </div>;
}
