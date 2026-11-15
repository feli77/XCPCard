import { TrainingPoints } from './TrainingPoints';
import { rarities } from '../content/data';
import { cardById } from '../game/engine';
import type { Profile } from '../game/types';
import { Card } from './Card';
import { PixelArt } from './PixelArt';

export function Training({ profile, onPurchase }: { profile: Profile; onPurchase: (id: string) => void }) {
  return <main className="training-page">
    <div className="page-heading"><div><span className="eyebrow">ONE MORE PRACTICE</span>
      <h1>加训 <small><TrainingPoints amount={profile.trainingPoints} /></small></h1>
      <p>题可以不补，强度必须补。每次完赛换一批，每项限兑一次。</p>
    </div></div>
    <h2>打包补课</h2>
    <div className="training-packs">
      {profile.trainingOffers.filter(offer => offer.kind === 'pack').map(offer => <section className="training-item panel" key={offer.id}>
        <div className="training-pack-art"><PixelArt kind={offer.category ? 'template' : 'trophy'} /></div>
        <h3>{offer.category ? `${offer.category}专项包` : '普通通用包'}</h3>
        <p>{offer.category ? `5 张${offer.category}算法卡，偏科也要偏得专业。` : '5 张随机卡，知识面主打一个随缘。'}</p>
        <Exchange purchased={offer.purchased} affordable={profile.trainingPoints >= offer.price} price={offer.price} onClick={() => onPurchase(offer.id)} />
      </section>)}
    </div>
    <h2>重点突破</h2>
    <div className="training-cards">
      {profile.trainingOffers.filter(offer => offer.kind === 'card').map(offer => <section className="training-item panel" key={offer.id}>
        <Card card={cardById[offer.cardId]} />
        <h3>{cardById[offer.cardId].name}</h3>
        <p>{rarities[cardById[offer.cardId].rarity].name} · 兑换后加入收藏</p>
        <Exchange purchased={offer.purchased} affordable={profile.trainingPoints >= offer.price} price={offer.price} onClick={() => onPurchase(offer.id)} />
      </section>)}
    </div>
    <p className="training-note">完成比赛 +100 训练点；收藏里的卡牌也能拖入「知识回炉」换取训练点。</p>
  </main>;
}

function Exchange({ purchased, affordable, price, onClick }: { purchased: boolean; affordable: boolean; price: number; onClick: () => void }) {
  return <button className="primary" disabled={purchased || !affordable} onClick={onClick}>
    {purchased ? '已兑换' : <><TrainingPoints amount={price} /> · {affordable ? '兑换' : '点数不足'}</>}
  </button>;
}
