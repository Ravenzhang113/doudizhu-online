import type { Card, Hand, PlayRecord } from '@shared/types';
import { identifyHand } from './handType';
import { canBeat } from './compare';

/**
 * 自由出牌验证：任意合法牌型即可
 * 返回识别出的 Hand，不合法返回 null
 */
export function isValidFreePlay(cards: Card[]): Hand | null {
  return identifyHand(cards);
}

/**
 * 跟牌验证：必须能压过上家
 * 返回识别出的 Hand，不合法返回 null
 */
export function isValidFollowPlay(cards: Card[], lastPlay: Hand): Hand | null {
  const hand = identifyHand(cards);
  if (hand === null) return null;
  if (!canBeat(hand, lastPlay)) return null;
  return hand;
}

/**
 * 检查出的牌是否都在手牌中，返回扣除后的手牌，不合法返回 null
 */
export function getRemainingHand(hand: Card[], played: Card[]): Card[] | null {
  const handCopy = [...hand];

  for (const card of played) {
    const index = handCopy.findIndex(
      (c) => c.suit === card.suit && c.rank === card.rank && c.value === card.value
    );
    if (index === -1) return null; // 牌不在手牌中
    handCopy.splice(index, 1);
  }

  return handCopy;
}

/**
 * 判断当前玩家是否为自由出牌（不需要跟牌）
 * 自由出牌条件：上一手是自己出的，或者连续 2 人 pass
 */
export function isFreePlay(lastPlay: PlayRecord | null, passCount: number, currentSeatIndex: number): boolean {
  if (lastPlay === null) return true; // 首次出牌
  if (passCount >= 2) return true; // 连续2人pass
  if (lastPlay.seatIndex === currentSeatIndex) return true; // 上一手是自己
  return false;
}
