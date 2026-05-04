import type { Card, HandType } from '@shared/types';

// === 客户端 → 服务端 ===
export type ClientMessage =
  | { type: 'join'; nickname: string }
  | { type: 'ready' }
  | { type: 'bid'; bid: 0 | 1 | 2 | 3 }
  | { type: 'play'; cards: Card[] }
  | { type: 'pass' }
  | { type: 'nextRound' }
  | { type: 'endGame' }
  | { type: 'ping' };

// === 服务端 → 客户端 ===
export type ServerMessage =
  | { type: 'roomState'; state: unknown }
  | { type: 'hand'; cards: Card[]; seatIndex: number }
  | { type: 'bidResult'; seatIndex: number; bid: number }
  | { type: 'playResult'; seatIndex: number; cards: Card[]; handType: HandType | null }
  | { type: 'passResult'; seatIndex: number }
  | { type: 'showThreeCards'; cards: Card[] }
  | { type: 'roundResult'; result: unknown }
  | { type: 'error'; message: string }
  | { type: 'pong' };

/**
 * 解析客户端消息，返回 ClientMessage 或 null
 */
export function parseClientMessage(raw: string): ClientMessage | null {
  try {
    const msg = JSON.parse(raw);

    if (typeof msg !== 'object' || msg === null || typeof msg.type !== 'string') {
      return null;
    }

    switch (msg.type) {
      case 'join':
        if (typeof msg.nickname === 'string' && msg.nickname.length >= 1 && msg.nickname.length <= 10) {
          return { type: 'join', nickname: msg.nickname.trim() };
        }
        return null;

      case 'ready':
        return { type: 'ready' };

      case 'bid':
        if ([0, 1, 2, 3].includes(msg.bid)) {
          return { type: 'bid', bid: msg.bid };
        }
        return null;

      case 'play':
        if (Array.isArray(msg.cards) && msg.cards.length > 0) {
          return { type: 'play', cards: msg.cards };
        }
        return null;

      case 'pass':
        return { type: 'pass' };

      case 'nextRound':
        return { type: 'nextRound' };

      case 'endGame':
        return { type: 'endGame' };

      case 'ping':
        return { type: 'ping' };

      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * 序列化服务端消息
 */
export function serializeServerMessage(msg: ServerMessage): string {
  return JSON.stringify(msg);
}
