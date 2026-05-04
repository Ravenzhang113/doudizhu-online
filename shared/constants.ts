// 扑克牌花色
export const SUITS = {
  SPADE: 'spade',
  HEART: 'heart',
  CLUB: 'club',
  DIAMOND: 'diamond',
  JOKER: 'joker',
} as const;

export type Suit = (typeof SUITS)[keyof typeof SUITS];

// 普通牌面
export const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'] as const;
export type Rank = (typeof RANKS)[number];

// 王牌面
export const JOKER_RANKS = { SMALL: 'S', BIG: 'B' } as const;
export type JokerRank = 'S' | 'B';

// 牌值映射（用于比较大小）
export const RANK_VALUES: Record<string, number> = {
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
  '2': 15,
  'S': 16, // 小王
  'B': 17, // 大王
};

// 花色显示符号
export const SUIT_SYMBOLS: Record<string, string> = {
  spade: '♠',
  heart: '♥',
  club: '♣',
  diamond: '♦',
  joker: '★',
};

// 花色颜色（红/黑）
export const SUIT_COLORS: Record<string, 'red' | 'black'> = {
  spade: 'black',
  heart: 'red',
  club: 'black',
  diamond: 'red',
  joker: 'black',
};

// 游戏阶段
export type Phase = 'waiting' | 'bidding' | 'playing' | 'scoring' | 'finished';
