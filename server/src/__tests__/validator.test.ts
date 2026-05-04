import { describe, it, expect } from 'vitest';
import { isValidFreePlay, isValidFollowPlay, getRemainingHand, isFreePlay } from '../game/validator';
import type { Card, Hand, PlayRecord } from '@shared/types';

function c(suit: string, rank: string, value: number): Card {
  return { suit: suit as Card['suit'], rank: rank as Card['rank'], value };
}
function hand(type: Hand['type'], mainValue: number, length: number, cards?: Card[]): Hand {
  return { type, cards: cards ?? [], mainValue, length };
}

describe('validator', () => {
  describe('isValidFreePlay', () => {
    it('should accept valid hand types', () => {
      const cards = [c('spade', '3', 3)];
      const result = isValidFreePlay(cards);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('SINGLE');
    });

    it('should accept bomb as free play', () => {
      const cards = [c('spade', '3', 3), c('heart', '3', 3), c('club', '3', 3), c('diamond', '3', 3)];
      expect(isValidFreePlay(cards)!.type).toBe('BOMB');
    });

    it('should reject invalid combinations', () => {
      const cards = [c('spade', '3', 3), c('heart', '5', 5)];
      expect(isValidFreePlay(cards)).toBeNull();
    });
  });

  describe('isValidFollowPlay', () => {
    it('should accept valid follow play', () => {
      const cards = [c('spade', '5', 5)];
      const lastPlay = hand('SINGLE', 3, 1);
      const result = isValidFollowPlay(cards, lastPlay);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('SINGLE');
      expect(result!.mainValue).toBe(5);
    });

    it('should reject weaker play', () => {
      const cards = [c('spade', '3', 3)];
      const lastPlay = hand('SINGLE', 5, 1);
      expect(isValidFollowPlay(cards, lastPlay)).toBeNull();
    });

    it('should accept bomb over non-bomb', () => {
      const cards = [c('spade', '3', 3), c('heart', '3', 3), c('club', '3', 3), c('diamond', '3', 3)];
      const lastPlay = hand('STRAIGHT', 3, 5);
      expect(isValidFollowPlay(cards, lastPlay)!.type).toBe('BOMB');
    });

    it('should reject different type without bomb', () => {
      const cards = [c('spade', '5', 5), c('heart', '5', 5)];
      const lastPlay = hand('SINGLE', 3, 1);
      expect(isValidFollowPlay(cards, lastPlay)).toBeNull();
    });

    it('should reject same type different length', () => {
      const cards = [c('spade', '3', 3), c('heart', '4', 4), c('club', '5', 5)];
      const lastPlay = hand('STRAIGHT', 3, 5);
      expect(isValidFollowPlay(cards, lastPlay)).toBeNull();
    });
  });

  describe('getRemainingHand', () => {
    it('should return remaining cards after valid play', () => {
      const hand: Card[] = [c('spade', '3', 3), c('heart', '5', 5), c('club', '7', 7)];
      const played: Card[] = [c('heart', '5', 5)];
      const remaining = getRemainingHand(hand, played);
      expect(remaining).not.toBeNull();
      expect(remaining!).toHaveLength(2);
      expect(remaining!.map((c) => c.value).sort()).toEqual([3, 7]);
    });

    it('should return null if card not in hand', () => {
      const hand: Card[] = [c('spade', '3', 3), c('heart', '5', 5)];
      const played: Card[] = [c('club', '7', 7)];
      expect(getRemainingHand(hand, played)).toBeNull();
    });

    it('should handle playing multiple cards', () => {
      const hand: Card[] = [c('spade', '3', 3), c('heart', '3', 3), c('club', '3', 3), c('diamond', '3', 3), c('spade', '5', 5)];
      const played: Card[] = [c('spade', '3', 3), c('heart', '3', 3), c('club', '3', 3), c('diamond', '3', 3)];
      const remaining = getRemainingHand(hand, played);
      expect(remaining).toHaveLength(1);
      expect(remaining![0].value).toBe(5);
    });

    it('should handle empty played array', () => {
      const hand: Card[] = [c('spade', '3', 3)];
      const remaining = getRemainingHand(hand, []);
      expect(remaining).toHaveLength(1);
    });

    it('should not modify original hand', () => {
      const hand: Card[] = [c('spade', '3', 3), c('heart', '5', 5)];
      const original = [...hand];
      getRemainingHand(hand, [c('spade', '3', 3)]);
      expect(hand).toEqual(original);
    });
  });

  describe('isFreePlay', () => {
    it('should return true for null lastPlay (first play)', () => {
      expect(isFreePlay(null, 0, 0)).toBe(true);
    });

    it('should return true when passCount >= 2', () => {
      const lastPlay: PlayRecord = {
        seatIndex: 1, cards: [], handType: 'SINGLE', isPass: false, timestamp: '',
      };
      expect(isFreePlay(lastPlay, 2, 0)).toBe(true);
    });

    it('should return true when lastPlay is from current player', () => {
      const lastPlay: PlayRecord = {
        seatIndex: 0, cards: [], handType: 'SINGLE', isPass: false, timestamp: '',
      };
      expect(isFreePlay(lastPlay, 0, 0)).toBe(true);
    });

    it('should return false when need to follow', () => {
      const lastPlay: PlayRecord = {
        seatIndex: 1, cards: [], handType: 'SINGLE', isPass: false, timestamp: '',
      };
      expect(isFreePlay(lastPlay, 0, 0)).toBe(false);
      expect(isFreePlay(lastPlay, 1, 0)).toBe(false);
    });
  });
});
