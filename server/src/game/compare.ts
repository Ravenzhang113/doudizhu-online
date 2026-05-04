import type { Hand } from '@shared/types';

/**
 * 判断 play 是否能压过 lastPlay
 */
export function canBeat(play: Hand, lastPlay: Hand): boolean {
  // 火箭压一切（实际游戏中火箭只有一副，不会出现双火箭，但做防御性校验）
  if (play.type === 'ROCKET' && lastPlay.type !== 'ROCKET') return true;

  // lastPlay 是火箭，无法压过
  if (lastPlay.type === 'ROCKET') return false;

  // 炸弹压非炸弹
  if (play.type === 'BOMB' && lastPlay.type !== 'BOMB') return true;

  // 炸弹 vs 炸弹：比 mainValue
  if (play.type === 'BOMB' && lastPlay.type === 'BOMB') {
    return play.mainValue > lastPlay.mainValue;
  }

  // 同类型同长度：比 mainValue
  if (play.type === lastPlay.type && play.length === lastPlay.length) {
    return play.mainValue > lastPlay.mainValue;
  }

  // 不同类型（非炸弹/火箭）不能压
  return false;
}
