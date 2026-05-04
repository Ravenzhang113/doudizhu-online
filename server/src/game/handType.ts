import type { Card, Hand, HandType } from '@shared/types';

/**
 * 统计每个 value 出现的次数
 */
export function countByValue(cards: Card[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const card of cards) {
    map.set(card.value, (map.get(card.value) ?? 0) + 1);
  }
  return map;
}

/**
 * 按出现次数分组
 */
export function groupByFrequency(countMap: Map<number, number>): {
  quads: number[];
  triples: number[];
  pairs: number[];
  singles: number[];
} {
  const quads: number[] = [];
  const triples: number[] = [];
  const pairs: number[] = [];
  const singles: number[] = [];

  for (const [value, count] of countMap) {
    switch (count) {
      case 4:
        quads.push(value);
        break;
      case 3:
        triples.push(value);
        break;
      case 2:
        pairs.push(value);
        break;
      case 1:
        singles.push(value);
        break;
    }
  }

  quads.sort((a, b) => a - b);
  triples.sort((a, b) => a - b);
  pairs.sort((a, b) => a - b);
  singles.sort((a, b) => a - b);

  return { quads, triples, pairs, singles };
}

/**
 * 检测一组 value 是否连续（差值均为1）
 */
export function isConsecutive(values: number[]): boolean {
  if (values.length < 2) return false;
  const sorted = [...values].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] !== 1) return false;
  }
  return true;
}

/**
 * 从一组连续 values 中找到最长的连续子序列
 */
export function findConsecutiveSequences(values: number[], minLen: number): number[][] {
  if (values.length < minLen) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const sequences: number[][] = [];
  let current = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] === 1) {
      current.push(sorted[i]);
    } else {
      if (current.length >= minLen) sequences.push(current);
      current = [sorted[i]];
    }
  }
  if (current.length >= minLen) sequences.push(current);

  return sequences;
}

/**
 * 识别一组牌的牌型
 * 返回 Hand 或 null（不合法）
 */
export function identifyHand(cards: Card[]): Hand | null {
  if (cards.length === 0) return null;

  const total = cards.length;
  const countMap = countByValue(cards);
  const { quads, triples, pairs, singles } = groupByFrequency(countMap);

  // 1. 火箭：大小王
  if (total === 2 && countMap.has(16) && countMap.has(17)) {
    return { type: 'ROCKET', cards, mainValue: 99, length: 2 };
  }

  // 2. 炸弹：4张相同
  if (total === 4 && quads.length === 1 && triples.length === 0 && pairs.length === 0 && singles.length === 0) {
    return { type: 'BOMB', cards, mainValue: quads[0], length: 4 };
  }

  // 3. 单张
  if (total === 1) {
    return { type: 'SINGLE', cards, mainValue: cards[0].value, length: 1 };
  }

  // 4. 对子（排除大小王：实际游戏中不可能有两张相同的王，但做防御性校验）
  if (total === 2 && pairs.length === 1 && singles.length === 0) {
    // 两个 value=16 或 value=17 不合法（一副牌各只有一张）
    if (cards[0].suit === 'joker' && cards[1].suit === 'joker') {
      return null;
    }
    return { type: 'PAIR', cards, mainValue: pairs[0], length: 2 };
  }

  // 5. 三条
  if (total === 3 && triples.length === 1 && pairs.length === 0 && singles.length === 0) {
    return { type: 'TRIPLE', cards, mainValue: triples[0], length: 3 };
  }

  // 6. 三带一
  if (total === 4 && triples.length === 1 && singles.length === 1 && pairs.length === 0 && quads.length === 0) {
    return { type: 'TRIPLE_ONE', cards, mainValue: triples[0], length: 4 };
  }

  // 7. 三带二
  if (total === 5 && triples.length === 1 && pairs.length === 1 && singles.length === 0 && quads.length === 0) {
    return { type: 'TRIPLE_TWO', cards, mainValue: triples[0], length: 5 };
  }

  // 8. 顺子：≥5张，全部是单张，连续，不含2(15)和王(16,17)
  if (total >= 5 && singles.length === total && pairs.length === 0 && triples.length === 0 && quads.length === 0) {
    if (isConsecutive(singles) && singles[singles.length - 1] <= 14) {
      return { type: 'STRAIGHT', cards, mainValue: singles[0], length: total };
    }
  }

  // 9. 连对：≥3对，连续，不含2和王
  if (total >= 6 && total % 2 === 0 && pairs.length === total / 2 && singles.length === 0 && triples.length === 0 && quads.length === 0) {
    if (isConsecutive(pairs) && pairs[pairs.length - 1] <= 14) {
      return { type: 'STRAIGHT_PAIR', cards, mainValue: pairs[0], length: total };
    }
  }

  // 10. 飞机系列：≥2个连续三条
  if (triples.length >= 2) {
    const sequences = findConsecutiveSequences(triples, 2);
    // 找到至少一个合法的连续三条序列
    for (const seq of sequences) {
      if (seq[seq.length - 1] > 14) continue; // 不含2

      const planeLen = seq.length;
      const planeCardCount = planeLen * 3;
      const remaining = total - planeCardCount;

      // 纯飞机（不带）
      if (remaining === 0) {
        return { type: 'PLANE', cards, mainValue: seq[0], length: total };
      }

      // 飞机带单：剩余牌数 = 飞机长度（每条带一张单牌）
      if (remaining === planeLen) {
        // 检查带的单牌数量是否正确
        // 注意：带的单牌可能来自 pairs（拆开）或 singles
        // 但不能包含飞机用的 triples
        return { type: 'PLANE_SINGLE', cards, mainValue: seq[0], length: total };
      }

      // 飞机带对：剩余牌数 = 飞机长度 × 2
      if (remaining === planeLen * 2) {
        // 检查剩余牌是否全是对子
        const nonPlaneTriples = triples.filter((v) => !seq.includes(v));
        const remainingPairs = pairs.length + nonPlaneTriples.length;
        const remainingSingles = singles.length;
        // 带的牌需要恰好是 planeLen 个对子
        if (remainingPairs === planeLen && remainingSingles === 0) {
          return { type: 'PLANE_PAIR', cards, mainValue: seq[0], length: total };
        }
        // 也可能是 pairs + 剩余 triples（如果 triples 超过飞机范围）
        if (remainingSingles === 0) {
          const totalPairCount = pairs.length + nonPlaneTriples.length;
          if (totalPairCount === planeLen) {
            return { type: 'PLANE_PAIR', cards, mainValue: seq[0], length: total };
          }
        }
      }
    }
  }

  // 11. 四带二系列
  if (quads.length === 1) {
    const remaining = total - 4;

    // 四带二单：剩余2张（可以是任意两张不同的牌，或一个对子拆开）
    if (remaining === 2 && triples.length === 0) {
      return { type: 'FOUR_TWO_SINGLE', cards, mainValue: quads[0], length: total };
    }

    // 四带二对：剩余4张，恰好2个对子
    if (remaining === 4 && pairs.length === 2 && singles.length === 0 && triples.length === 0) {
      return { type: 'FOUR_TWO_PAIR', cards, mainValue: quads[0], length: total };
    }
  }

  return null;
}
