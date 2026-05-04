/**
 * 阶段1完整边界测试
 * 覆盖所有牌型的边界条件、积分极端场景、出牌验证边界
 */
import { describe, it, expect } from 'vitest';
import { identifyHand } from '../game/handType';
import { canBeat } from '../game/compare';
import { calculateScore, detectSpring, countBombs } from '../game/scoring';
import { isValidFreePlay, isValidFollowPlay, getRemainingHand, isFreePlay } from '../game/validator';
import type { Card, Hand, PlayRecord } from '@shared/types';

function c(suit: string, rank: string, value: number): Card {
  return { suit: suit as Card['suit'], rank: rank as Card['rank'], value };
}
function makeHand(type: Hand['type'], mainValue: number, length: number): Hand {
  return { type, cards: [], mainValue, length };
}
function play(seatIndex: number, handType: string | null, isPass: boolean): PlayRecord {
  return { seatIndex, cards: [], handType: handType as PlayRecord['handType'], isPass, timestamp: '' };
}

describe('阶段1 完整边界验证', () => {
  // === 牌型边界 ===
  describe('牌型边界', () => {
    it('6张顺子 (3-8)', () => {
      const cards = [c('s','3',3), c('h','4',4), c('c','5',5), c('d','6',6), c('s','7',7), c('h','8',8)];
      const result = identifyHand(cards);
      expect(result!.type).toBe('STRAIGHT');
      expect(result!.length).toBe(6);
      expect(result!.mainValue).toBe(3);
    });

    it('最长顺子 (3-A, 12张)', () => {
      const cards: Card[] = [];
      for (let v = 3; v <= 14; v++) cards.push(c('s', String(v), v));
      const result = identifyHand(cards);
      expect(result!.type).toBe('STRAIGHT');
      expect(result!.length).toBe(12);
    });

    it('顺子不能包含2 (10-J-Q-K-2 应为null)', () => {
      const cards = [c('s','10',10), c('h','J',11), c('c','Q',12), c('d','K',13), c('s','2',15)];
      expect(identifyHand(cards)).toBeNull();
    });

    it('4对连对 (33-44-55-66)', () => {
      const cards = [
        c('s','3',3), c('h','3',3),
        c('s','4',4), c('h','4',4),
        c('s','5',5), c('h','5',5),
        c('s','6',6), c('h','6',6),
      ];
      const result = identifyHand(cards);
      expect(result!.type).toBe('STRAIGHT_PAIR');
      expect(result!.length).toBe(8);
    });

    it('连对不能包含2', () => {
      const cards = [
        c('s','K',13), c('h','K',13),
        c('s','A',14), c('h','A',14),
        c('s','2',15), c('h','2',15),
      ];
      expect(identifyHand(cards)).toBeNull();
    });

    it('飞机带单 - 3个连续三条+3单牌 (8张)', () => {
      const cards = [
        c('s','3',3), c('h','3',3), c('c','3',3),
        c('s','4',4), c('h','4',4), c('c','4',4),
        c('s','5',5), c('h','5',5), c('c','5',5),
        c('s','7',7), c('h','8',8), c('c','9',9),
      ];
      const result = identifyHand(cards);
      expect(result!.type).toBe('PLANE_SINGLE');
      expect(result!.mainValue).toBe(3);
    });

    it('飞机带对 - 2个连续三条+2对 (10张)', () => {
      const cards = [
        c('s','6',6), c('h','6',6), c('c','6',6),
        c('s','7',7), c('h','7',7), c('c','7',7),
        c('s','9',9), c('h','9',9),
        c('s','10',10), c('h','10',10),
      ];
      const result = identifyHand(cards);
      expect(result!.type).toBe('PLANE_PAIR');
      expect(result!.mainValue).toBe(6);
    });

    it('四带二单 - 带大小王', () => {
      const cards = [
        c('s','8',8), c('h','8',8), c('c','8',8), c('d','8',8),
        c('joker','S',16), c('joker','B',17),
      ];
      const result = identifyHand(cards);
      expect(result!.type).toBe('FOUR_TWO_SINGLE');
    });

    it('四带二对 - 8张', () => {
      const cards = [
        c('s','9',9), c('h','9',9), c('c','9',9), c('d','9',9),
        c('s','3',3), c('h','3',3),
        c('s','5',5), c('h','5',5),
      ];
      const result = identifyHand(cards);
      expect(result!.type).toBe('FOUR_TWO_PAIR');
    });

    it('2张王不是对子', () => {
      // 大小王是火箭，不是对子
      const cards = [c('joker','S',16), c('joker','B',17)];
      expect(identifyHand(cards)!.type).toBe('ROCKET');
    });

    it('炸弹的 mainValue 正确 (value=2 的炸弹)', () => {
      const cards = [c('s','2',15), c('h','2',15), c('c','2',15), c('d','2',15)];
      const result = identifyHand(cards);
      expect(result!.type).toBe('BOMB');
      expect(result!.mainValue).toBe(15);
    });

    it('不连续的三条不是飞机', () => {
      const cards = [
        c('s','3',3), c('h','3',3), c('c','3',3),
        c('s','7',7), c('h','7',7), c('c','7',7),
      ];
      // 3和7不连续，不是飞机
      expect(identifyHand(cards)).toBeNull();
    });

    it('5张完全随机的牌应为null', () => {
      const cards = [c('s','3',3), c('h','5',5), c('c','7',7), c('d','9',9), c('s','J',11)];
      expect(identifyHand(cards)).toBeNull();
    });
  });

  // === 比较边界 ===
  describe('出牌比较边界', () => {
    it('最小炸弹(3) vs 最大非炸弹(2的单张)', () => {
      expect(canBeat(makeHand('BOMB', 3, 4), makeHand('SINGLE', 15, 1))).toBe(true);
    });

    it('顺子不能压不同长度的顺子', () => {
      expect(canBeat(makeHand('STRAIGHT', 5, 6), makeHand('STRAIGHT', 3, 5))).toBe(false);
    });

    it('连对不能压对子', () => {
      expect(canBeat(makeHand('STRAIGHT_PAIR', 3, 6), makeHand('PAIR', 14, 2))).toBe(false);
    });

    it('三带一不能压三条', () => {
      expect(canBeat(makeHand('TRIPLE_ONE', 5, 4), makeHand('TRIPLE', 3, 3))).toBe(false);
    });

    it('飞机不能压三条（类型不同）', () => {
      expect(canBeat(makeHand('PLANE', 3, 6), makeHand('TRIPLE', 5, 3))).toBe(false);
    });
  });

  // === 积分边界 ===
  describe('积分边界', () => {
    it('叫1分，无翻倍，地主赢 → 地主+2，农民各-1', () => {
      const result = calculateScore(1, 0, false, 'landlord', 0);
      expect(result.finalScore).toBe(1);
      expect(result.scoreChanges).toEqual([2, -1, -1]);
    });

    it('叫3分，3个炸弹+春天 → 翻倍 ×8 ×2 = 48', () => {
      // bidScore=3, 3 bombs → 2^3=8, spring → ×2, multiplier=16
      // finalScore = 3 × 16 = 48
      const result = calculateScore(3, 3, true, 'landlord', 1);
      expect(result.finalScore).toBe(48);
      expect(result.scoreChanges[1]).toBe(96);  // 地主
      expect(result.scoreChanges[0]).toBe(-48);  // 农民
      expect(result.scoreChanges[2]).toBe(-48);  // 农民
    });

    it('零和验证：所有积分之和为0', () => {
      const cases: Array<[1|2|3, number, boolean, 'landlord'|'farmer', number]> = [
        [1, 0, false, 'landlord', 0],
        [1, 0, false, 'farmer', 0],
        [2, 1, false, 'landlord', 1],
        [3, 0, true, 'farmer', 2],
        [3, 3, true, 'landlord', 0],
        [2, 2, false, 'farmer', 1],
      ];
      for (const [bid, bombs, spring, team, landlord] of cases) {
        const result = calculateScore(bid, bombs, spring, team, landlord);
        const sum = result.scoreChanges.reduce((a, b) => a + b, 0);
        expect(sum).toBe(0);
      }
    });

    it('春天检测：地主只在第一手出了牌（反春天）', () => {
      const history: PlayRecord[] = [
        play(0, 'PAIR', false), // 地主出牌
        play(1, 'STRAIGHT', false), // 农民1出牌
        play(2, 'SINGLE', false), // 农民2出牌
        play(1, 'SINGLE', false), // 农民1出完，农民赢
      ];
      // 地主只出了1次非pass
      expect(detectSpring(history, 0, 'farmer')).toBe(true);
    });

    it('春天检测：农民2有pass但没出过牌', () => {
      const history: PlayRecord[] = [
        play(0, 'SINGLE', false),
        play(1, 'SINGLE', false),
        play(2, null, true),     // 农民2只有pass
        play(0, 'SINGLE', false),
        play(1, 'SINGLE', false),
        play(2, null, true),     // 农民2只有pass
        play(0, 'SINGLE', false), // 地主出完
      ];
      // 农民2 (index 2) 没有 non-pass 记录
      expect(detectSpring(history, 0, 'landlord')).toBe(true);
    });
  });

  // === 出牌验证边界 ===
  describe('出牌验证边界', () => {
    it('出空手牌（最后一张）', () => {
      const hand: Card[] = [c('s', '3', 3)];
      const played: Card[] = [c('s', '3', 3)];
      const remaining = getRemainingHand(hand, played);
      expect(remaining).not.toBeNull();
      expect(remaining!).toHaveLength(0);
    });

    it('出牌中包含不在手牌中的牌', () => {
      const hand: Card[] = [c('s', '3', 3), c('h', '5', 5)];
      const played: Card[] = [c('s', '3', 3), c('c', '7', 7)]; // 7不在手牌中
      expect(getRemainingHand(hand, played)).toBeNull();
    });

    it('重复出同一张牌（不可能但需验证）', () => {
      const hand: Card[] = [c('s', '3', 3), c('h', '5', 5)];
      const played: Card[] = [c('s', '3', 3), c('s', '3', 3)]; // 出了两次3
      expect(getRemainingHand(hand, played)).toBeNull();
    });

    it('isFreePlay: passCount=1 但上家是自己 → 自由出牌', () => {
      const lastPlay: PlayRecord = { seatIndex: 0, cards: [], handType: 'SINGLE', isPass: false, timestamp: '' };
      // 上家是自己，即使 passCount=1 也自由出牌
      expect(isFreePlay(lastPlay, 1, 0)).toBe(true);
    });

    it('isFreePlay: passCount=2 且上家不是自己 → 自由出牌', () => {
      const lastPlay: PlayRecord = { seatIndex: 1, cards: [], handType: 'SINGLE', isPass: false, timestamp: '' };
      expect(isFreePlay(lastPlay, 2, 0)).toBe(true);
    });

    it('跟牌时火箭压任何牌', () => {
      const cards = [c('joker', 'S', 16), c('joker', 'B', 17)];
      const lastPlay = makeHand('BOMB', 15, 4); // 2的炸弹
      const result = isValidFollowPlay(cards, lastPlay);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('ROCKET');
    });
  });
});
