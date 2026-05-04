import { describe, it, expect } from 'vitest';
import { canBeat } from '../game/compare';
import type { Hand } from '@shared/types';

function hand(type: Hand['type'], mainValue: number, length: number): Hand {
  return { type, cards: [], mainValue, length };
}

describe('canBeat', () => {
  it('rocket beats everything', () => {
    expect(canBeat(hand('ROCKET', 99, 2), hand('BOMB', 14, 4))).toBe(true);
    expect(canBeat(hand('ROCKET', 99, 2), hand('STRAIGHT', 3, 5))).toBe(true);
    expect(canBeat(hand('ROCKET', 99, 2), hand('SINGLE', 15, 1))).toBe(true);
  });

  it('nothing beats rocket', () => {
    expect(canBeat(hand('BOMB', 14, 4), hand('ROCKET', 99, 2))).toBe(false);
    expect(canBeat(hand('STRAIGHT', 3, 5), hand('ROCKET', 99, 2))).toBe(false);
  });

  it('bomb beats non-bomb non-rocket', () => {
    expect(canBeat(hand('BOMB', 3, 4), hand('STRAIGHT', 10, 5))).toBe(true);
    expect(canBeat(hand('BOMB', 3, 4), hand('PAIR', 14, 2))).toBe(true);
    expect(canBeat(hand('BOMB', 3, 4), hand('TRIPLE_ONE', 10, 4))).toBe(true);
  });

  it('bomb vs bomb: compare mainValue', () => {
    expect(canBeat(hand('BOMB', 5, 4), hand('BOMB', 3, 4))).toBe(true);
    expect(canBeat(hand('BOMB', 3, 4), hand('BOMB', 5, 4))).toBe(false);
  });

  it('same type same length: compare mainValue', () => {
    expect(canBeat(hand('SINGLE', 10, 1), hand('SINGLE', 5, 1))).toBe(true);
    expect(canBeat(hand('SINGLE', 5, 1), hand('SINGLE', 10, 1))).toBe(false);
    expect(canBeat(hand('PAIR', 10, 2), hand('PAIR', 5, 2))).toBe(true);
    expect(canBeat(hand('STRAIGHT', 5, 5), hand('STRAIGHT', 3, 5))).toBe(true);
    expect(canBeat(hand('STRAIGHT', 3, 5), hand('STRAIGHT', 5, 5))).toBe(false);
  });

  it('same type different length: cannot beat', () => {
    expect(canBeat(hand('STRAIGHT', 3, 5), hand('STRAIGHT', 3, 6))).toBe(false);
    expect(canBeat(hand('STRAIGHT', 3, 6), hand('STRAIGHT', 3, 5))).toBe(false);
  });

  it('different type (non-bomb): cannot beat', () => {
    expect(canBeat(hand('PAIR', 14, 2), hand('SINGLE', 3, 1))).toBe(false);
    expect(canBeat(hand('TRIPLE', 10, 3), hand('PAIR', 10, 2))).toBe(false);
  });

  it('rocket beats rocket is impossible (but value check)', () => {
    // 火箭只有一个，实际游戏中不会出现两个火箭比较
    // 但逻辑上，同类型同长度比较 mainValue，都是99所以 false
    expect(canBeat(hand('ROCKET', 99, 2), hand('ROCKET', 99, 2))).toBe(false);
  });
});
