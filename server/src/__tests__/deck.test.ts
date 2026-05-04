import { describe, it, expect } from 'vitest';
import { createDeck, shuffle, deal, sortHand } from '../game/deck';
import type { Card } from '@shared/types';

describe('deck', () => {
  describe('createDeck', () => {
    it('should create 54 cards', () => {
      const deck = createDeck();
      expect(deck).toHaveLength(54);
    });

    it('should have 52 normal cards + 2 jokers', () => {
      const deck = createDeck();
      const jokers = deck.filter((c) => c.suit === 'joker');
      const normals = deck.filter((c) => c.suit !== 'joker');
      expect(jokers).toHaveLength(2);
      expect(normals).toHaveLength(52);
    });

    it('should have unique cards', () => {
      const deck = createDeck();
      const keys = deck.map((c) => `${c.suit}-${c.rank}`);
      expect(new Set(keys).size).toBe(54);
    });

    it('should have correct value range', () => {
      const deck = createDeck();
      for (const card of deck) {
        expect(card.value).toBeGreaterThanOrEqual(3);
        expect(card.value).toBeLessThanOrEqual(17);
      }
    });

    it('should have one small joker (value 16) and one big joker (value 17)', () => {
      const deck = createDeck();
      const smallJoker = deck.find((c) => c.rank === 'S');
      const bigJoker = deck.find((c) => c.rank === 'B');
      expect(smallJoker).toBeDefined();
      expect(smallJoker!.value).toBe(16);
      expect(bigJoker).toBeDefined();
      expect(bigJoker!.value).toBe(17);
    });
  });

  describe('shuffle', () => {
    it('should return an array of same length', () => {
      const deck = createDeck();
      const shuffled = shuffle(deck);
      expect(shuffled).toHaveLength(54);
    });

    it('should contain the same cards', () => {
      const deck = createDeck();
      const shuffled = shuffle(deck);
      const originalKeys = new Set(deck.map((c) => `${c.suit}-${c.rank}`));
      const shuffledKeys = new Set(shuffled.map((c) => `${c.suit}-${c.rank}`));
      expect(originalKeys).toEqual(shuffledKeys);
    });

    it('should not modify the original array', () => {
      const deck = createDeck();
      const originalKeys = deck.map((c) => `${c.suit}-${c.rank}`).join(',');
      shuffle(deck);
      const afterKeys = deck.map((c) => `${c.suit}-${c.rank}`).join(',');
      expect(originalKeys).toBe(afterKeys);
    });

    it('should produce different order (statistically)', () => {
      const deck = createDeck();
      const results = new Set<string>();
      for (let i = 0; i < 10; i++) {
        results.add(shuffle(deck).map((c) => c.value).join(','));
      }
      // 10次洗牌中至少有2种不同顺序
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('deal', () => {
    it('should deal 17 cards to each player', () => {
      const deck = createDeck();
      const { hands } = deal(shuffle(deck));
      expect(hands[0]).toHaveLength(17);
      expect(hands[1]).toHaveLength(17);
      expect(hands[2]).toHaveLength(17);
    });

    it('should leave 3 cards as threeCards', () => {
      const deck = createDeck();
      const { threeCards } = deal(shuffle(deck));
      expect(threeCards).toHaveLength(3);
    });

    it('should deal all 54 cards without duplication', () => {
      const deck = createDeck();
      const { hands, threeCards } = deal(shuffle(deck));
      const allCards = [...hands[0], ...hands[1], ...hands[2], ...threeCards];
      expect(allCards).toHaveLength(54);
      const keys = new Set(allCards.map((c) => `${c.suit}-${c.rank}`));
      expect(keys.size).toBe(54);
    });

    it('should throw if deck is not 54 cards', () => {
      expect(() => deal([])).toThrow('Deck must have 54 cards');
      expect(() => deal(createDeck().slice(0, 50))).toThrow('Deck must have 54 cards');
    });
  });

  describe('sortHand', () => {
    it('should sort by value descending', () => {
      const cards: Card[] = [
        { suit: 'spade', rank: '3', value: 3 },
        { suit: 'heart', rank: 'A', value: 14 },
        { suit: 'club', rank: '7', value: 7 },
      ];
      const sorted = sortHand(cards);
      expect(sorted[0].value).toBe(14);
      expect(sorted[1].value).toBe(7);
      expect(sorted[2].value).toBe(3);
    });

    it('should sort same value by suit (spade > heart > club > diamond)', () => {
      const cards: Card[] = [
        { suit: 'diamond', rank: 'K', value: 13 },
        { suit: 'club', rank: 'K', value: 13 },
        { suit: 'spade', rank: 'K', value: 13 },
        { suit: 'heart', rank: 'K', value: 13 },
      ];
      const sorted = sortHand(cards);
      expect(sorted.map((c) => c.suit)).toEqual(['spade', 'heart', 'club', 'diamond']);
    });

    it('should handle empty array', () => {
      expect(sortHand([])).toEqual([]);
    });

    it('should not modify original array', () => {
      const cards: Card[] = [
        { suit: 'spade', rank: '3', value: 3 },
        { suit: 'heart', rank: 'A', value: 14 },
      ];
      const original = [...cards];
      sortHand(cards);
      expect(cards).toEqual(original);
    });

    it('should sort jokers correctly (big joker first)', () => {
      const cards: Card[] = [
        { suit: 'joker', rank: 'S', value: 16 },
        { suit: 'joker', rank: 'B', value: 17 },
      ];
      const sorted = sortHand(cards);
      expect(sorted[0].rank).toBe('B');
      expect(sorted[1].rank).toBe('S');
    });
  });
});
