import { describe, it, expect } from 'vitest';
import { identifyHand, countByValue, groupByFrequency, isConsecutive, findConsecutiveSequences } from '../game/handType';
import type { Card } from '@shared/types';

// 辅助函数：快速创建牌
function c(suit: string, rank: string, value: number): Card {
  return { suit: suit as Card['suit'], rank: rank as Card['rank'], value };
}
function spade(rank: string, value: number) { return c('spade', rank, value); }
function heart(rank: string, value: number) { return c('heart', rank, value); }
function club(rank: string, value: number) { return c('club', rank, value); }
function diamond(rank: string, value: number) { return c('diamond', rank, value); }
function smallJoker() { return c('joker', 'S', 16); }
function bigJoker() { return c('joker', 'B', 17); }

describe('handType helpers', () => {
  describe('countByValue', () => {
    it('should count card frequencies', () => {
      const cards = [spade('3', 3), heart('3', 3), club('5', 5)];
      const map = countByValue(cards);
      expect(map.get(3)).toBe(2);
      expect(map.get(5)).toBe(1);
    });

    it('should handle empty array', () => {
      expect(countByValue([]).size).toBe(0);
    });
  });

  describe('groupByFrequency', () => {
    it('should group correctly', () => {
      // 4×3, 3×5, 2×7, 1×9
      const map = new Map<number, number>([[3, 4], [5, 3], [7, 2], [9, 1]]);
      const result = groupByFrequency(map);
      expect(result.quads).toEqual([3]);
      expect(result.triples).toEqual([5]);
      expect(result.pairs).toEqual([7]);
      expect(result.singles).toEqual([9]);
    });
  });

  describe('isConsecutive', () => {
    it('should detect consecutive values', () => {
      expect(isConsecutive([3, 4, 5, 6, 7])).toBe(true);
    });

    it('should detect non-consecutive values', () => {
      expect(isConsecutive([3, 5, 6])).toBe(false);
    });

    it('should return false for single value', () => {
      expect(isConsecutive([5])).toBe(false);
    });

    it('should handle unsorted input', () => {
      expect(isConsecutive([7, 5, 6])).toBe(true);
    });
  });

  describe('findConsecutiveSequences', () => {
    it('should find consecutive sequences of min length', () => {
      const seqs = findConsecutiveSequences([3, 4, 5, 7, 8, 9, 10], 2);
      expect(seqs).toEqual([[3, 4, 5], [7, 8, 9, 10]]);
    });

    it('should return empty for no sequences', () => {
      expect(findConsecutiveSequences([3, 5, 7], 2)).toEqual([]);
    });
  });
});

describe('identifyHand', () => {
  it('should return null for empty cards', () => {
    expect(identifyHand([])).toBeNull();
  });

  // === ROCKET ===
  describe('ROCKET', () => {
    it('should identify rocket (small + big joker)', () => {
      const result = identifyHand([smallJoker(), bigJoker()]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('ROCKET');
      expect(result!.mainValue).toBe(99);
    });

    it('should not identify two small jokers as rocket', () => {
      expect(identifyHand([smallJoker(), smallJoker()])).toBeNull();
    });

    it('should not identify two big jokers as rocket', () => {
      expect(identifyHand([bigJoker(), bigJoker()])).toBeNull();
    });
  });

  // === BOMB ===
  describe('BOMB', () => {
    it('should identify bomb (4 same value)', () => {
      const cards = [spade('3', 3), heart('3', 3), club('3', 3), diamond('3', 3)];
      const result = identifyHand(cards);
      expect(result!.type).toBe('BOMB');
      expect(result!.mainValue).toBe(3);
    });

    it('should identify bomb of A', () => {
      const cards = [spade('A', 14), heart('A', 14), club('A', 14), diamond('A', 14)];
      const result = identifyHand(cards);
      expect(result!.type).toBe('BOMB');
      expect(result!.mainValue).toBe(14);
    });

    it('should not identify 3 cards as bomb', () => {
      const cards = [spade('3', 3), heart('3', 3), club('3', 3)];
      expect(identifyHand(cards)!.type).toBe('TRIPLE');
    });
  });

  // === SINGLE ===
  describe('SINGLE', () => {
    it('should identify single card', () => {
      const result = identifyHand([spade('3', 3)]);
      expect(result!.type).toBe('SINGLE');
      expect(result!.mainValue).toBe(3);
    });

    it('should identify single joker', () => {
      expect(identifyHand([bigJoker()])!.type).toBe('SINGLE');
    });
  });

  // === PAIR ===
  describe('PAIR', () => {
    it('should identify pair', () => {
      const result = identifyHand([spade('K', 13), heart('K', 13)]);
      expect(result!.type).toBe('PAIR');
      expect(result!.mainValue).toBe(13);
    });

    it('should not identify bomb as pair', () => {
      const cards = [spade('3', 3), heart('3', 3), club('3', 3), diamond('3', 3)];
      expect(identifyHand(cards)!.type).toBe('BOMB');
    });
  });

  // === TRIPLE ===
  describe('TRIPLE', () => {
    it('should identify triple', () => {
      const cards = [spade('5', 5), heart('5', 5), club('5', 5)];
      const result = identifyHand(cards);
      expect(result!.type).toBe('TRIPLE');
      expect(result!.mainValue).toBe(5);
    });
  });

  // === TRIPLE_ONE ===
  describe('TRIPLE_ONE', () => {
    it('should identify triple with one', () => {
      const cards = [spade('5', 5), heart('5', 5), club('5', 5), spade('3', 3)];
      const result = identifyHand(cards);
      expect(result!.type).toBe('TRIPLE_ONE');
      expect(result!.mainValue).toBe(5);
    });

    it('should identify triple with joker', () => {
      const cards = [spade('5', 5), heart('5', 5), club('5', 5), bigJoker()];
      expect(identifyHand(cards)!.type).toBe('TRIPLE_ONE');
    });
  });

  // === TRIPLE_TWO ===
  describe('TRIPLE_TWO', () => {
    it('should identify triple with pair', () => {
      const cards = [spade('5', 5), heart('5', 5), club('5', 5), spade('3', 3), heart('3', 3)];
      const result = identifyHand(cards);
      expect(result!.type).toBe('TRIPLE_TWO');
      expect(result!.mainValue).toBe(5);
    });

    it('should not identify triple with two singles as triple_two or plane', () => {
      // 三条+2个不同单牌 = 5张，不是三带二（带的是对子），也不是飞机（需要连续三条）
      const cards = [spade('5', 5), heart('5', 5), club('5', 5), spade('3', 3), heart('4', 4)];
      expect(identifyHand(cards)).toBeNull();
    });
  });

  // === STRAIGHT ===
  describe('STRAIGHT', () => {
    it('should identify 5-card straight', () => {
      const cards = [spade('3', 3), heart('4', 4), club('5', 5), diamond('6', 6), spade('7', 7)];
      const result = identifyHand(cards);
      expect(result!.type).toBe('STRAIGHT');
      expect(result!.mainValue).toBe(3);
      expect(result!.length).toBe(5);
    });

    it('should identify 12-card straight (3 to A)', () => {
      const cards = [
        spade('3', 3), heart('4', 4), club('5', 5), diamond('6', 6), spade('7', 7),
        heart('8', 8), club('9', 9), diamond('10', 10), spade('J', 11), heart('Q', 12),
        club('K', 13), diamond('A', 14),
      ];
      const result = identifyHand(cards);
      expect(result!.type).toBe('STRAIGHT');
      expect(result!.mainValue).toBe(3);
    });

    it('should not identify straight containing 2', () => {
      const cards = [spade('10', 10), heart('J', 11), club('Q', 12), diamond('K', 13), spade('2', 15)];
      expect(identifyHand(cards)).toBeNull();
    });

    it('should not identify straight containing joker', () => {
      const cards = [spade('3', 3), heart('4', 4), club('5', 5), diamond('6', 6), smallJoker()];
      expect(identifyHand(cards)).toBeNull();
    });

    it('should not identify non-consecutive cards as straight', () => {
      const cards = [spade('3', 3), heart('4', 4), club('6', 6), diamond('7', 7), spade('8', 8)];
      expect(identifyHand(cards)).toBeNull();
    });

    it('should not identify 4 cards as straight', () => {
      const cards = [spade('3', 3), heart('4', 4), club('5', 5), diamond('6', 6)];
      expect(identifyHand(cards)).toBeNull();
    });
  });

  // === STRAIGHT_PAIR ===
  describe('STRAIGHT_PAIR', () => {
    it('should identify 3 consecutive pairs', () => {
      const cards = [
        spade('3', 3), heart('3', 3),
        spade('4', 4), heart('4', 4),
        spade('5', 5), heart('5', 5),
      ];
      const result = identifyHand(cards);
      expect(result!.type).toBe('STRAIGHT_PAIR');
      expect(result!.mainValue).toBe(3);
    });

    it('should identify 10 consecutive pairs', () => {
      const cards: Card[] = [];
      for (let v = 3; v <= 12; v++) {
        cards.push(spade(String(v), v), heart(String(v), v));
      }
      const result = identifyHand(cards);
      expect(result!.type).toBe('STRAIGHT_PAIR');
    });

    it('should not identify pairs containing 2', () => {
      const cards = [
        spade('K', 13), heart('K', 13),
        spade('A', 14), heart('A', 14),
        spade('2', 15), heart('2', 15),
      ];
      expect(identifyHand(cards)).toBeNull();
    });

    it('should not identify 2 pairs as straight_pair', () => {
      const cards = [spade('3', 3), heart('3', 3), spade('4', 4), heart('4', 4)];
      expect(identifyHand(cards)).toBeNull();
    });
  });

  // === PLANE series ===
  describe('PLANE', () => {
    it('should identify pure plane (2 consecutive triples)', () => {
      const cards = [
        spade('3', 3), heart('3', 3), club('3', 3),
        spade('4', 4), heart('4', 4), club('4', 4),
      ];
      const result = identifyHand(cards);
      expect(result!.type).toBe('PLANE');
      expect(result!.mainValue).toBe(3);
    });

    it('should identify 3 consecutive triples', () => {
      const cards = [
        spade('5', 5), heart('5', 5), club('5', 5),
        spade('6', 6), heart('6', 6), club('6', 6),
        spade('7', 7), heart('7', 7), club('7', 7),
      ];
      const result = identifyHand(cards);
      expect(result!.type).toBe('PLANE');
      expect(result!.mainValue).toBe(5);
    });
  });

  describe('PLANE_SINGLE', () => {
    it('should identify plane with singles', () => {
      const cards = [
        spade('3', 3), heart('3', 3), club('3', 3),
        spade('4', 4), heart('4', 4), club('4', 4),
        spade('7', 7), spade('8', 8),
      ];
      const result = identifyHand(cards);
      expect(result!.type).toBe('PLANE_SINGLE');
      expect(result!.mainValue).toBe(3);
    });

    it('should identify plane with singles (using joker)', () => {
      const cards = [
        spade('3', 3), heart('3', 3), club('3', 3),
        spade('4', 4), heart('4', 4), club('4', 4),
        spade('7', 7), bigJoker(),
      ];
      const result = identifyHand(cards);
      expect(result!.type).toBe('PLANE_SINGLE');
    });
  });

  describe('PLANE_PAIR', () => {
    it('should identify plane with pairs', () => {
      const cards = [
        spade('3', 3), heart('3', 3), club('3', 3),
        spade('4', 4), heart('4', 4), club('4', 4),
        spade('7', 7), heart('7', 7),
        spade('8', 8), heart('8', 8),
      ];
      const result = identifyHand(cards);
      expect(result!.type).toBe('PLANE_PAIR');
      expect(result!.mainValue).toBe(3);
    });
  });

  // === FOUR_TWO series ===
  describe('FOUR_TWO_SINGLE', () => {
    it('should identify four with two singles', () => {
      const cards = [spade('3', 3), heart('3', 3), club('3', 3), diamond('3', 3), spade('5', 5), heart('7', 7)];
      const result = identifyHand(cards);
      expect(result!.type).toBe('FOUR_TWO_SINGLE');
      expect(result!.mainValue).toBe(3);
    });

    it('should identify four with joker as single', () => {
      const cards = [spade('3', 3), heart('3', 3), club('3', 3), diamond('3', 3), smallJoker(), bigJoker()];
      // 这是6张 = 4 + 2张（大小王）→ 四带二单
      const result = identifyHand(cards);
      expect(result!.type).toBe('FOUR_TWO_SINGLE');
    });
  });

  describe('FOUR_TWO_PAIR', () => {
    it('should identify four with two pairs', () => {
      const cards = [
        spade('3', 3), heart('3', 3), club('3', 3), diamond('3', 3),
        spade('5', 5), heart('5', 5),
        spade('7', 7), heart('7', 7),
      ];
      const result = identifyHand(cards);
      expect(result!.type).toBe('FOUR_TWO_PAIR');
      expect(result!.mainValue).toBe(3);
    });

    it('should not identify four with 4 random singles as four_two_pair', () => {
      const cards = [
        spade('3', 3), heart('3', 3), club('3', 3), diamond('3', 3),
        spade('5', 5), heart('7', 7), spade('8', 8), heart('9', 9),
      ];
      // 8张 = 4 + 4张单牌 → 不是四带二对（因为不是对子）
      expect(identifyHand(cards)).toBeNull();
    });
  });

  // === Edge cases ===
  describe('edge cases', () => {
    it('should return null for invalid combinations', () => {
      // 2张不相同的牌（非对子）
      expect(identifyHand([spade('3', 3), heart('5', 5)])).toBeNull();
      // 4张不相同的牌
      expect(identifyHand([spade('3', 3), heart('4', 4), club('5', 5), diamond('6', 6)])).toBeNull();
      // 3张不相同的牌
      expect(identifyHand([spade('3', 3), heart('4', 4), club('6', 6)])).toBeNull();
    });

    it('should return null for 5 random cards (not straight, not triple_two)', () => {
      const cards = [spade('3', 3), heart('3', 3), club('5', 5), diamond('7', 7), spade('9', 9)];
      expect(identifyHand(cards)).toBeNull();
    });

    it('should identify A-2-3-4-5 is NOT a straight (2 is excluded)', () => {
      const cards = [spade('A', 14), heart('2', 15), club('3', 3), diamond('4', 4), spade('5', 5)];
      expect(identifyHand(cards)).toBeNull();
    });

    it('should handle plane not containing 2', () => {
      // 飞机包含2的三条 → 不合法
      const cards = [
        spade('A', 14), heart('A', 14), club('A', 14),
        spade('2', 15), heart('2', 15), club('2', 15),
      ];
      expect(identifyHand(cards)).toBeNull();
    });
  });
});
