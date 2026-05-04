import type { Suit, Rank, JokerRank, Phase } from './constants';

// 扑克牌
export interface Card {
  suit: Suit;
  rank: Rank | JokerRank;
  value: number; // 3-17
}

// 牌型
export type HandType =
  | 'SINGLE'
  | 'PAIR'
  | 'TRIPLE'
  | 'TRIPLE_ONE'
  | 'TRIPLE_TWO'
  | 'STRAIGHT'
  | 'STRAIGHT_PAIR'
  | 'PLANE'
  | 'PLANE_SINGLE'
  | 'PLANE_PAIR'
  | 'FOUR_TWO_SINGLE'
  | 'FOUR_TWO_PAIR'
  | 'BOMB'
  | 'ROCKET';

// 牌型识别结果
export interface Hand {
  type: HandType;
  cards: Card[];
  mainValue: number;
  length: number;
}

// 玩家
export interface Player {
  id: string;
  nickname: string;
  seatIndex: 0 | 1 | 2;
  isConnected: boolean;
  lastActiveAt: string;
  isReady: boolean;
}

// 叫分记录
export interface BiddingRecord {
  seatIndex: number;
  bid: 0 | 1 | 2 | 3;
  timestamp: string;
}

// 出牌记录
export interface PlayRecord {
  seatIndex: number;
  cards: Card[];
  handType: HandType | null;
  isPass: boolean;
  timestamp: string;
}

// 单局结算
export interface RoundResult {
  roundNumber: number;
  landlordIndex: number;
  bidScore: 1 | 2 | 3;
  threeCards: Card[];
  winnerTeam: 'landlord' | 'farmer';
  bombCount: number;
  isSpring: boolean;
  multiplier: number;
  finalScore: number;
  scoreChanges: [number, number, number];
  biddingHistory: BiddingRecord[];
  playHistory: PlayRecord[];
  playerCardCounts: [number, number, number];
  dealtAt: string;
  finishedAt: string;
}

// 游戏配置
export interface GameSettings {
  maxPlayers: 3;
  enableBomb: boolean;
  enableRocket: boolean;
  enableSpring: boolean;
  baseScore: number;
}

// 游戏房间完整状态
export interface GameRoom {
  id: string;
  players: (Player | null)[];
  hostIndex: number;
  phase: Phase;
  settings: GameSettings;
  createdAt: string;
  updatedAt: string;
  currentRound: number;
  deck: Card[];
  hands: [Card[], Card[], Card[]];
  threeCards: Card[];
  landlordIndex: number | null;
  currentPlayerIndex: number;
  lastPlay: PlayRecord | null;
  passCount: number;
  bombCount: number;
  biddingHistory: BiddingRecord[];
  currentBidderIndex: number;
  rounds: RoundResult[];
  totalScores: [number, number, number];
}

// 消息协议 — 客户端 → 服务端
export type ClientMessage =
  | { type: 'join'; nickname: string }
  | { type: 'ready' }
  | { type: 'bid'; bid: 0 | 1 | 2 | 3 }
  | { type: 'play'; cards: Card[] }
  | { type: 'pass' }
  | { type: 'nextRound' }
  | { type: 'endGame' }
  | { type: 'ping' };

// 消息协议 — 服务端 → 客户端
export type ServerMessage =
  | { type: 'roomState'; state: RoomPublicState }
  | { type: 'hand'; cards: Card[]; seatIndex: number }
  | { type: 'bidResult'; seatIndex: number; bid: number }
  | { type: 'playResult'; seatIndex: number; cards: Card[]; handType: HandType | null }
  | { type: 'passResult'; seatIndex: number }
  | { type: 'showThreeCards'; cards: Card[] }
  | { type: 'roundResult'; result: RoundResult }
  | { type: 'error'; message: string }
  | { type: 'pong' };

// 公开房间状态（视角隔离）
export interface RoomPublicState {
  roomId: string;
  players: { nickname: string; seatIndex: number; isConnected: boolean }[];
  phase: Phase;
  landlordIndex: number | null;
  currentPlayerIndex: number;
  lastPlay: { seatIndex: number; cards: Card[]; handType: HandType | null } | null;
  passCount: number;
  handCounts: [number, number, number];
  totalScores: [number, number, number];
  roundNumber: number;
  settings: GameSettings;
}
