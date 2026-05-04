import type { Card } from '@shared/types';
import { SUITS, RANKS, RANK_VALUES } from '@shared/constants';

/**
 * 创建一副标准54张扑克牌
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];

  // 普通牌：4花色 × 13张 = 52张
  for (const suit of [SUITS.SPADE, SUITS.HEART, SUITS.CLUB, SUITS.DIAMOND]) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, value: RANK_VALUES[rank] });
    }
  }

  // 大小王：2张
  deck.push({ suit: SUITS.JOKER, rank: 'S', value: RANK_VALUES['S'] }); // 小王
  deck.push({ suit: SUITS.JOKER, rank: 'B', value: RANK_VALUES['B'] }); // 大王

  return deck;
}

/**
 * Fisher-Yates 洗牌算法，返回新数组
 */
export function shuffle(deck: Card[]): Card[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 发牌：每人17张，留3张底牌
 */
export function deal(deck: Card[]): { hands: [Card[], Card[], Card[]]; threeCards: Card[] } {
  if (deck.length !== 54) {
    throw new Error(`Deck must have 54 cards, got ${deck.length}`);
  }

  const hands: [Card[], Card[], Card[]] = [[], [], []];

  // 前51张按顺序分给3个玩家，每人17张
  for (let i = 0; i < 51; i++) {
    hands[i % 3].push(deck[i]);
  }

  // 最后3张为底牌
  const threeCards = deck.slice(51, 54);

  return { hands, threeCards };
}

/**
 * 手牌排序：按 value 降序，相同 value 按花色排序（♠ > ♥ > ♣ > ♦）
 */
export function sortHand(cards: Card[]): Card[] {
  const suitOrder: Record<string, number> = {
    spade: 4,
    heart: 3,
    club: 2,
    diamond: 1,
    joker: 5,
  };

  return [...cards].sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    return (suitOrder[b.suit] ?? 0) - (suitOrder[a.suit] ?? 0);
  });
}
