import type { Card as CardType, HandType } from '@shared/types';
import Card from './Card';

interface Props {
  cards: CardType[];
  handType: HandType | null;
  isFree?: boolean;
  playerName?: string;
}

const HAND_TYPE_NAMES: Record<string, string> = {
  SINGLE: '单张',
  PAIR: '对子',
  TRIPLE: '三条',
  TRIPLE_ONE: '三带一',
  TRIPLE_TWO: '三带二',
  STRAIGHT: '顺子',
  STRAIGHT_PAIR: '连对',
  PLANE: '飞机',
  PLANE_SINGLE: '飞机带单',
  PLANE_PAIR: '飞机带对',
  FOUR_TWO_SINGLE: '四带二',
  FOUR_TWO_PAIR: '四带二对',
  BOMB: '炸弹',
  ROCKET: '火箭',
};

export default function PlayArea({ cards, handType, isFree, playerName }: Props) {
  if (isFree) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="text-cream text-lg font-bold">自由出牌</span>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1">
        {playerName && <span className="text-cream/70 text-sm">{playerName} 不出</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {playerName && <span className="text-cream/70 text-xs">{playerName}</span>}
      <div className="flex gap-0.5">
        {cards.map((card, i) => (
          <Card key={i} card={card} small />
        ))}
      </div>
      {handType && (
        <span className="text-gold-light font-bold text-sm">
          {HAND_TYPE_NAMES[handType] || handType}
        </span>
      )}
    </div>
  );
}
