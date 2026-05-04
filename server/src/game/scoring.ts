import type { PlayRecord } from '@shared/types';

/**
 * 统计本局炸弹数量（含火箭）
 */
export function countBombs(playHistory: PlayRecord[]): number {
  let count = 0;
  for (const record of playHistory) {
    if (record.isPass) continue;
    if (record.handType === 'BOMB' || record.handType === 'ROCKET') {
      count++;
    }
  }
  return count;
}

/**
 * 检测春天
 * - 春天：地主赢 + 至少一个农民没出过牌（playHistory 中没有非 pass 的出牌记录）
 * - 反春天：农民赢 + 地主只出了第一手牌
 */
export function detectSpring(
  playHistory: PlayRecord[],
  landlordIndex: number,
  winnerTeam: 'landlord' | 'farmer'
): boolean {
  if (winnerTeam === 'landlord') {
    // 春天：检查是否有农民一张牌都没出过
    const farmerIndices = [0, 1, 2].filter((i) => i !== landlordIndex);
    for (const fi of farmerIndices) {
      const farmerPlays = playHistory.filter((r) => r.seatIndex === fi && !r.isPass);
      if (farmerPlays.length === 0) return true;
    }
    return false;
  } else {
    // 反春天：地主只出了一次牌（第一次出的牌，之后全是 pass 或没轮到）
    const landlordPlays = playHistory.filter((r) => r.seatIndex === landlordIndex && !r.isPass);
    return landlordPlays.length <= 1;
  }
}

/**
 * 计算积分
 */
export function calculateScore(
  bidScore: 1 | 2 | 3,
  bombCount: number,
  isSpring: boolean,
  winnerTeam: 'landlord' | 'farmer',
  landlordIndex: number
): { finalScore: number; scoreChanges: [number, number, number] } {
  let multiplier = 1;

  // 炸弹翻倍
  if (bombCount > 0) {
    multiplier *= Math.pow(2, bombCount);
  }

  // 春天翻倍
  if (isSpring) {
    multiplier *= 2;
  }

  const finalScore = bidScore * multiplier;

  // 地主赢：地主 +2×finalScore，每个农民 -finalScore
  // 农民赢：地主 -2×finalScore，每个农民 +finalScore
  const scoreChanges: [number, number, number] = [0, 0, 0];
  const farmerIndices = [0, 1, 2].filter((i) => i !== landlordIndex);

  if (winnerTeam === 'landlord') {
    scoreChanges[landlordIndex] = 2 * finalScore;
    for (const fi of farmerIndices) {
      scoreChanges[fi] = -finalScore;
    }
  } else {
    scoreChanges[landlordIndex] = -2 * finalScore;
    for (const fi of farmerIndices) {
      scoreChanges[fi] = finalScore;
    }
  }

  return { finalScore, scoreChanges };
}
