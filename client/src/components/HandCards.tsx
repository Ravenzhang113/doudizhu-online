import type { Card as CardType } from '@shared/types';
import Card from './Card';

interface Props {
  cards: CardType[];
  selectedIndices: Set<number>;
  onToggle: (index: number) => void;
  disabled?: boolean;
}

export default function HandCards({ cards, selectedIndices, onToggle, disabled }: Props) {
  if (cards.length === 0) return null;

  return (
    <div className="flex items-end justify-center overflow-x-auto px-2 py-1" style={{ minHeight: 100 }}>
      {cards.map((card, i) => (
        <div
          key={`${card.suit}-${card.rank}-${i}`}
          style={{ marginLeft: i > 0 ? -24 : 0 }}
        >
          <Card
            card={card}
            selected={selectedIndices.has(i)}
            onClick={disabled ? undefined : () => onToggle(i)}
          />
        </div>
      ))}
    </div>
  );
}
