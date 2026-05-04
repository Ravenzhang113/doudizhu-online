import type { Card as CardType } from '@shared/types';
import { SUIT_SYMBOLS } from '@shared/constants';

interface Props {
  card: CardType;
  selected?: boolean;
  onClick?: () => void;
  small?: boolean;
}

export default function Card({ card, selected, onClick, small }: Props) {
  const isJoker = card.suit === 'joker';
  const isRed = card.suit === 'heart' || card.suit === 'diamond';
  const isJokerSmall = isJoker && card.rank === 'S';
  const isJokerBig = isJoker && card.rank === 'B';

  let colorClass = isRed ? 'red' : 'black';
  if (isJokerSmall) colorClass = 'joker-small';
  if (isJokerBig) colorClass = 'joker-big';

  const sizeClass = small ? 'w-10 h-14' : '';
  const rankSize = small ? 'text-sm' : '';
  const suitSize = small ? 'text-xs' : '';

  return (
    <div
      className={`poker-card ${colorClass} ${selected ? 'selected' : ''} ${sizeClass}`}
      onClick={onClick}
    >
      <span className={`suit ${suitSize}`}>
        {isJoker ? (isJokerSmall ? '小' : '大') : SUIT_SYMBOLS[card.suit]}
      </span>
      <span className={`rank ${rankSize}`}>
        {isJoker ? '王' : card.rank}
      </span>
    </div>
  );
}
