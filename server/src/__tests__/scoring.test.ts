import { describe, it, expect } from 'vitest';
import { countBombs, detectSpring, calculateScore } from '../game/scoring';
import type { PlayRecord } from '@shared/types';

function play(seatIndex: number, handType: string | null, isPass: boolean): PlayRecord {
  return { seatIndex, cards: [], handType: handType as PlayRecord['handType'], isPass, timestamp: new Date().toISOString() };
}

describe('scoring', () => {
  describe('countBombs', () => {
    it('should count bombs and rockets', () => {
      const history: PlayRecord[] = [
        play(0, 'SINGLE', false),
        play(1, 'BOMB', false),
        play(2, 'SINGLE', false),
        play(0, 'ROCKET', false),
        play(1, null, true),
      ];
      expect(countBombs(history)).toBe(2);
    });

    it('should return 0 when no bombs', () => {
      const history: PlayRecord[] = [
        play(0, 'SINGLE', false),
        play(1, 'PAIR', false),
        play(2, 'TRIPLE', false),
      ];
      expect(countBombs(history)).toBe(0);
    });

    it('should skip pass records', () => {
      const history: PlayRecord[] = [
        play(0, null, true),
        play(1, null, true),
        play(2, 'SINGLE', false),
      ];
      expect(countBombs(history)).toBe(0);
    });
  });

  describe('detectSpring', () => {
    it('should detect spring (landlord wins, farmer never played)', () => {
      const history: PlayRecord[] = [
        play(0, 'SINGLE', false), // landlord plays
        play(1, null, true),       // farmer 1 passes
        play(2, null, true),       // farmer 2 passes
        play(0, 'SINGLE', false), // landlord plays again and wins
      ];
      expect(detectSpring(history, 0, 'landlord')).toBe(true);
    });

    it('should not detect spring when both farmers played', () => {
      const history: PlayRecord[] = [
        play(0, 'SINGLE', false),
        play(1, 'SINGLE', false), // farmer 1 played
        play(2, 'SINGLE', false), // farmer 2 played
        play(0, 'SINGLE', false),
      ];
      expect(detectSpring(history, 0, 'landlord')).toBe(false);
    });

    it('should detect spring when only one farmer never played', () => {
      const history: PlayRecord[] = [
        play(0, 'SINGLE', false),
        play(1, 'SINGLE', false), // farmer 1 played
        play(2, null, true),       // farmer 2 never played
        play(0, 'SINGLE', false),
      ];
      // farmer 2 (index 2) has no non-pass records
      expect(detectSpring(history, 0, 'landlord')).toBe(true);
    });

    it('should detect anti-spring (farmers win, landlord only played once)', () => {
      const history: PlayRecord[] = [
        play(0, 'SINGLE', false), // landlord's only play
        play(1, 'SINGLE', false),
        play(2, 'SINGLE', false),
        play(1, 'SINGLE', false), // farmer wins
      ];
      expect(detectSpring(history, 0, 'farmer')).toBe(true);
    });

    it('should not detect anti-spring when landlord played more than once', () => {
      const history: PlayRecord[] = [
        play(0, 'SINGLE', false),
        play(1, 'SINGLE', false),
        play(2, 'SINGLE', false),
        play(0, 'SINGLE', false), // landlord played again
        play(1, 'SINGLE', false),
      ];
      expect(detectSpring(history, 0, 'farmer')).toBe(false);
    });
  });

  describe('calculateScore', () => {
    it('should calculate basic score (no multiplier)', () => {
      const result = calculateScore(3, 0, false, 'landlord', 0);
      expect(result.finalScore).toBe(3);
      expect(result.scoreChanges).toEqual([6, -3, -3]);
    });

    it('should calculate score with bomb multiplier', () => {
      const result = calculateScore(2, 1, false, 'landlord', 1);
      // bidScore=2, 1 bomb → multiplier=2, finalScore=4
      expect(result.finalScore).toBe(4);
      expect(result.scoreChanges).toEqual([-4, 8, -4]);
    });

    it('should calculate score with spring multiplier', () => {
      const result = calculateScore(1, 0, true, 'landlord', 2);
      // bidScore=1, spring → multiplier=2, finalScore=2
      expect(result.finalScore).toBe(2);
      expect(result.scoreChanges).toEqual([-2, -2, 4]);
    });

    it('should calculate score with bomb + spring', () => {
      const result = calculateScore(3, 2, true, 'landlord', 0);
      // bidScore=3, 2 bombs → ×4, spring → ×2, total multiplier=8
      // finalScore=24
      expect(result.finalScore).toBe(24);
      expect(result.scoreChanges).toEqual([48, -24, -24]);
    });

    it('should calculate farmer win score', () => {
      const result = calculateScore(2, 0, false, 'farmer', 0);
      // bidScore=2, farmer wins
      expect(result.finalScore).toBe(2);
      expect(result.scoreChanges).toEqual([-4, 2, 2]);
    });

    it('should verify zero-sum (total score changes = 0)', () => {
      const scenarios: Array<[1|2|3, number, boolean, 'landlord'|'farmer', number]> = [
        [1, 0, false, 'landlord', 0],
        [3, 2, true, 'landlord', 1],
        [2, 1, false, 'farmer', 2],
        [1, 3, true, 'farmer', 0],
      ];
      for (const [bidScore, bombs, spring, team, landlord] of scenarios) {
        const result = calculateScore(bidScore, bombs, spring, team, landlord);
        const sum = result.scoreChanges.reduce((a, b) => a + b, 0);
        expect(sum).toBe(0);
      }
    });
  });
});
