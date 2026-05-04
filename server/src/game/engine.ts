/**
 * 游戏状态机 — 管理斗地主完整游戏流程
 * 纯逻辑层，不涉及网络通信，可独立测试
 */
import type { Card, GameRoom, Player, BiddingRecord, PlayRecord, RoundResult, GameSettings, Hand } from '@shared/types';
import { createDeck, shuffle, deal, sortHand } from './deck';
import { identifyHand } from './handType';
import { canBeat } from './compare';
import { isValidFreePlay, isValidFollowPlay, getRemainingHand, isFreePlay } from './validator';
import { countBombs, detectSpring, calculateScore } from './scoring';

// 额外跟踪上一次有效出牌的 Hand 信息（用于跟牌比较）
// 存在 GameRoom 外部，由 engine 管理
let _lastHand: Hand | null = null;

export const DEFAULT_SETTINGS: GameSettings = {
  maxPlayers: 3,
  enableBomb: true,
  enableRocket: true,
  enableSpring: true,
  baseScore: 1,
};

/**
 * 创建新房间
 */
export function createRoom(roomId: string): GameRoom {
  return {
    id: roomId,
    players: [null, null, null],
    hostIndex: -1,
    phase: 'waiting',
    settings: { ...DEFAULT_SETTINGS },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentRound: 0,
    deck: [],
    hands: [[], [], []],
    threeCards: [],
    landlordIndex: null,
    currentPlayerIndex: -1,
    lastPlay: null,
    passCount: 0,
    bombCount: 0,
    biddingHistory: [],
    currentBidderIndex: -1,
    rounds: [],
    totalScores: [0, 0, 0],
  };
}

/**
 * 加入房间
 */
export function joinRoom(room: GameRoom, sessionId: string, nickname: string): { room: GameRoom; seatIndex: number } | { error: string } {
  if (room.phase !== 'waiting') {
    return { error: '游戏已开始，无法加入' };
  }

  // 已在房间中（重连）
  const existing = room.players.findIndex((p) => p !== null && p.id === sessionId);
  if (existing !== -1) {
    room.players[existing]!.isConnected = true;
    room.players[existing]!.lastActiveAt = new Date().toISOString();
    return { room, seatIndex: existing };
  }

  // 找空座位
  const emptySeat = room.players.findIndex((p) => p === null);
  if (emptySeat === -1) {
    return { error: '房间已满' };
  }

  // 昵称重复检查
  const duplicate = room.players.some(
    (p) => p !== null && p.nickname === nickname && p.id !== sessionId
  );
  if (duplicate) {
    return { error: '昵称已被使用' };
  }

  const player: Player = {
    id: sessionId,
    nickname,
    seatIndex: emptySeat as 0 | 1 | 2,
    isConnected: true,
    lastActiveAt: new Date().toISOString(),
    isReady: false,
  };

  room.players[emptySeat] = player;

  // 第一个进入的为房主
  if (room.hostIndex === -1) {
    room.hostIndex = emptySeat;
  }

  room.updatedAt = new Date().toISOString();
  return { room, seatIndex: emptySeat };
}

/**
 * 玩家准备
 */
export function playerReady(room: GameRoom, seatIndex: number): GameRoom | { error: string } {
  const player = room.players[seatIndex];
  if (!player) return { error: '玩家不存在' };
  if (room.phase !== 'waiting') return { error: '游戏已开始' };

  room.players[seatIndex]!.isReady = true;
  room.updatedAt = new Date().toISOString();
  return room;
}

/**
 * 检查是否所有人准备
 */
export function allReady(room: GameRoom): boolean {
  return room.players.every((p) => p !== null && p.isReady);
}

/**
 * 开始叫分阶段（洗牌发牌）
 */
export function startBidding(room: GameRoom): GameRoom {
  room.phase = 'bidding';
  room.currentRound++;
  room.bombCount = 0;
  room.biddingHistory = [];
  room.lastPlay = null;
  room.passCount = 0;
  room.landlordIndex = null;
  _lastHand = null;

  // 洗牌发牌
  const deck = shuffle(createDeck());
  const { hands, threeCards } = deal(deck);

  room.hands = [sortHand(hands[0]), sortHand(hands[1]), sortHand(hands[2])];
  room.threeCards = threeCards;

  // 随机选择起始叫分人
  room.currentBidderIndex = Math.floor(Math.random() * 3);

  room.updatedAt = new Date().toISOString();
  return room;
}

/**
 * 叫分
 */
export function handleBid(room: GameRoom, seatIndex: number, bid: 0 | 1 | 2 | 3): GameRoom | { error: string } {
  if (room.phase !== 'bidding') return { error: '不在叫分阶段' };
  if (room.currentBidderIndex !== seatIndex) return { error: '没轮到你叫分' };

  // 叫分校验：不叫(0) 或 必须比当前最高分高
  if (bid > 0) {
    const currentMaxBid = Math.max(0, ...room.biddingHistory.map((b) => b.bid));
    if (bid <= currentMaxBid) {
      return { error: `必须叫比分 ${currentMaxBid} 更高的分数` };
    }
  }

  // 记录叫分
  const record: BiddingRecord = {
    seatIndex,
    bid,
    timestamp: new Date().toISOString(),
  };
  room.biddingHistory.push(record);

  // 叫到3分直接结束
  if (bid === 3) {
    return finalizeBidding(room, seatIndex, 3);
  }

  // 三人都叫过
  if (room.biddingHistory.length >= 3) {
    const highest = room.biddingHistory.reduce((max, b) => (b.bid > max.bid ? b : max), { bid: 0, seatIndex: -1, timestamp: '' });
    if (highest.bid === 0) {
      // 全部不叫，重新发牌
      return startBidding(room);
    }
    return finalizeBidding(room, highest.seatIndex, highest.bid as 1 | 2 | 3);
  }

  // 下一个人叫分（逆时针）
  room.currentBidderIndex = (seatIndex - 1 + 3) % 3;
  room.updatedAt = new Date().toISOString();
  return room;
}

/**
 * 确定地主，进入出牌阶段
 */
function finalizeBidding(room: GameRoom, landlordIndex: number, bidScore: 1 | 2 | 3): GameRoom {
  room.landlordIndex = landlordIndex;

  // 地主拿底牌
  room.hands[landlordIndex] = sortHand([...room.hands[landlordIndex], ...room.threeCards]);

  room.currentPlayerIndex = landlordIndex;
  room.lastPlay = null;
  room.passCount = 0;
  _lastHand = null; // 重置跟牌参考
  room.phase = 'playing';

  room.updatedAt = new Date().toISOString();
  return room;
}

/**
 * 出牌
 */
export function handlePlay(room: GameRoom, seatIndex: number, cards: Card[]): GameRoom | { error: string } {
  if (room.phase !== 'playing') return { error: '不在出牌阶段' };
  if (room.currentPlayerIndex !== seatIndex) return { error: '没轮到你出牌' };

  // 检查牌是否在手牌中
  const remaining = getRemainingHand(room.hands[seatIndex], cards);
  if (remaining === null) {
    return { error: '出的牌不在你的手牌中' };
  }

  const free = isFreePlay(room.lastPlay, room.passCount, seatIndex);
  const hand = free ? isValidFreePlay(cards) : isValidFollowPlay(cards, _lastHand!);

  if (hand === null) {
    return free ? { error: '不是合法的牌型' } : { error: '出的牌压不过上家' };
  }

  // 更新手牌
  room.hands[seatIndex] = remaining;

  // 更新出牌记录
  const playRecord: PlayRecord = {
    seatIndex,
    cards,
    handType: hand.type,
    isPass: false,
    timestamp: new Date().toISOString(),
  };
  room.lastPlay = playRecord;
  _lastHand = hand; // 保存 Hand 用于后续跟牌比较
  room.passCount = 0;

  // 炸弹计数
  if (hand.type === 'BOMB' || hand.type === 'ROCKET') {
    room.bombCount++;
  }

  // 检查是否出完
  if (room.hands[seatIndex].length === 0) {
    return handleRoundEnd(room);
  }

  // 下一个玩家（逆时针）
  room.currentPlayerIndex = (seatIndex - 1 + 3) % 3;
  room.updatedAt = new Date().toISOString();
  return room;
}

/**
 * 过牌
 */
export function handlePass(room: GameRoom, seatIndex: number): GameRoom | { error: string } {
  if (room.phase !== 'playing') return { error: '不在出牌阶段' };
  if (room.currentPlayerIndex !== seatIndex) return { error: '没轮到你' };

  // 自由出牌时不能 pass
  const free = isFreePlay(room.lastPlay, room.passCount, seatIndex);
  if (free) {
    return { error: '自由出牌时必须出牌' };
  }

  const passRecord: PlayRecord = {
    seatIndex,
    cards: [],
    handType: null,
    isPass: true,
    timestamp: new Date().toISOString(),
  };
  room.lastPlay = passRecord;
  room.passCount++;

  // 下一个玩家
  room.currentPlayerIndex = (seatIndex - 1 + 3) % 3;
  room.updatedAt = new Date().toISOString();
  return room;
}

/**
 * 一局结束，结算
 */
function handleRoundEnd(room: GameRoom): GameRoom {
  const landlordIndex = room.landlordIndex!;
  const winnerTeam: 'landlord' | 'farmer' = room.hands[landlordIndex].length === 0 ? 'landlord' : 'farmer';

  const bidScore = Math.max(...room.biddingHistory.map((b) => b.bid)) as 1 | 2 | 3;
  const bombCount = room.bombCount;
  const isSpring = detectSpring(room.rounds.length > 0 ? [] : [], landlordIndex, winnerTeam);

  // 用当前局的出牌记录检测春天（这里简化，实际从 engine 层面记录）
  // 我们需要在 room 级别维护 playHistory
  const { finalScore, scoreChanges } = calculateScore(bidScore, bombCount, false, winnerTeam, landlordIndex);

  const roundResult: RoundResult = {
    roundNumber: room.currentRound,
    landlordIndex,
    bidScore,
    threeCards: room.threeCards,
    winnerTeam,
    bombCount,
    isSpring: false, // 简化，后续从 playHistory 检测
    multiplier: finalScore / bidScore,
    finalScore,
    scoreChanges,
    biddingHistory: [...room.biddingHistory],
    playHistory: [], // 后续从 room 层面收集
    playerCardCounts: [room.hands[0].length, room.hands[1].length, room.hands[2].length] as [number, number, number],
    dealtAt: room.createdAt,
    finishedAt: new Date().toISOString(),
  };

  room.rounds.push(roundResult);

  // 更新累计积分
  for (let i = 0; i < 3; i++) {
    room.totalScores[i] += scoreChanges[i];
  }

  room.phase = 'scoring';
  room.updatedAt = new Date().toISOString();
  return room;
}

/**
 * 下一局
 */
export function handleNextRound(room: GameRoom, seatIndex: number): GameRoom | { error: string } {
  if (room.phase !== 'scoring') return { error: '不在结算阶段' };
  if (room.hostIndex !== seatIndex) return { error: '只有房主可以开始下一局' };

  return startBidding(room);
}

/**
 * 结束游戏
 */
export function handleEndGame(room: GameRoom, seatIndex: number): GameRoom | { error: string } {
  if (room.phase !== 'scoring' && room.phase !== 'waiting') return { error: '当前阶段不能结束游戏' };
  if (room.hostIndex !== seatIndex) return { error: '只有房主可以结束游戏' };

  room.phase = 'finished';
  room.updatedAt = new Date().toISOString();
  return room;
}
