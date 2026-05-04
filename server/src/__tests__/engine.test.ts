import { describe, it, expect } from 'vitest';
import {
  createRoom,
  joinRoom,
  playerReady,
  allReady,
  startBidding,
  handleBid,
  handlePlay,
  handlePass,
  handleNextRound,
  handleEndGame,
} from '../game/engine';
import type { GameRoom, Card } from '@shared/types';

function c(suit: string, rank: string, value: number): Card {
  return { suit: suit as Card['suit'], rank: rank as Card['rank'], value };
}

describe('engine', () => {
  // 创建一个3人准备好的房间
  function createReadyRoom(): GameRoom {
    let room = createRoom('TEST01');
    const r1 = joinRoom(room, 'session-0', 'Alice');
    if ('room' in r1) { room = r1.room; }
    const r2 = joinRoom(room, 'session-1', 'Bob');
    if ('room' in r2) { room = r2.room; }
    const r3 = joinRoom(room, 'session-2', 'Charlie');
    if ('room' in r3) { room = r3.room; }

    room.players[0]!.isReady = true;
    room.players[1]!.isReady = true;
    room.players[2]!.isReady = true;

    return room;
  }

  describe('createRoom', () => {
    it('should create room with correct defaults', () => {
      const room = createRoom('ABC123');
      expect(room.id).toBe('ABC123');
      expect(room.phase).toBe('waiting');
      expect(room.players).toEqual([null, null, null]);
      expect(room.totalScores).toEqual([0, 0, 0]);
    });
  });

  describe('joinRoom', () => {
    it('should add first player as host', () => {
      const room = createRoom('TEST');
      const result = joinRoom(room, 's1', 'Alice');
      if ('error' in result) throw new Error(result.error);
      expect(result.seatIndex).toBe(0);
      expect(room.hostIndex).toBe(0);
      expect(room.players[0]!.nickname).toBe('Alice');
    });

    it('should add second and third player', () => {
      let room = createRoom('TEST');
      joinRoom(room, 's1', 'Alice');
      const r2 = joinRoom(room, 's2', 'Bob');
      const r3 = joinRoom(room, 's3', 'Charlie');
      if ('error' in r2) throw new Error(r2.error);
      if ('error' in r3) throw new Error(r3.error);
      expect(r2.seatIndex).toBe(1);
      expect(r3.seatIndex).toBe(2);
    });

    it('should reject when room is full', () => {
      let room = createRoom('TEST');
      joinRoom(room, 's1', 'A');
      joinRoom(room, 's2', 'B');
      joinRoom(room, 's3', 'C');
      const r4 = joinRoom(room, 's4', 'D');
      expect('error' in r4).toBe(true);
    });

    it('should reject duplicate nickname', () => {
      let room = createRoom('TEST');
      joinRoom(room, 's1', 'Alice');
      const r2 = joinRoom(room, 's2', 'Alice');
      expect('error' in r2).toBe(true);
    });

    it('should handle rejoin (same sessionId)', () => {
      let room = createRoom('TEST');
      joinRoom(room, 's1', 'Alice');
      const r2 = joinRoom(room, 's1', 'Alice');
      if ('error' in r2) throw new Error(r2.error);
      expect(r2.seatIndex).toBe(0);
      expect(room.players[0]!.isConnected).toBe(true);
    });

    it('should reject join when game started', () => {
      const room = createReadyRoom();
      startBidding(room);
      const r = joinRoom(room, 's4', 'Dave');
      expect('error' in r).toBe(true);
    });
  });

  describe('playerReady', () => {
    it('should mark player as ready', () => {
      let room = createRoom('TEST');
      joinRoom(room, 's1', 'Alice');
      const result = playerReady(room, 0);
      if ('error' in result) throw new Error(result.error);
      expect(room.players[0]!.isReady).toBe(true);
    });

    it('should reject ready when game started', () => {
      const room = createReadyRoom();
      startBidding(room);
      const result = playerReady(room, 0);
      expect('error' in result).toBe(true);
    });
  });

  describe('startBidding', () => {
    it('should deal 17 cards to each player and 3 threeCards', () => {
      const room = createReadyRoom();
      startBidding(room);
      expect(room.phase).toBe('bidding');
      expect(room.hands[0]).toHaveLength(17);
      expect(room.hands[1]).toHaveLength(17);
      expect(room.hands[2]).toHaveLength(17);
      expect(room.threeCards).toHaveLength(3);
      expect(room.currentRound).toBe(1);
    });

    it('should sort hands', () => {
      const room = createReadyRoom();
      startBidding(room);
      for (const hand of room.hands) {
        for (let i = 0; i < hand.length - 1; i++) {
          expect(hand[i].value).toBeGreaterThanOrEqual(hand[i + 1].value);
        }
      }
    });
  });

  describe('bidding flow', () => {
    it('should handle complete bidding: A calls 1, B calls 2, C calls 3 → C is landlord', () => {
      const room = createReadyRoom();
      startBidding(room);
      const startBidder = room.currentBidderIndex;

      // 第一人叫1分
      let result = handleBid(room, startBidder, 1);
      if ('error' in result) throw new Error(result.error);

      // 第二人叫2分（逆时针）
      const bidder2 = (startBidder - 1 + 3) % 3;
      expect(room.currentBidderIndex).toBe(bidder2);
      result = handleBid(room, bidder2, 2);
      if ('error' in result) throw new Error(result.error);

      // 第三人叫3分
      const bidder3 = (bidder2 - 1 + 3) % 3;
      expect(room.currentBidderIndex).toBe(bidder3);
      result = handleBid(room, bidder3, 3);
      if ('error' in result) throw new Error(result.error);

      // 叫3分直接结束，进入出牌阶段
      expect(room.phase).toBe('playing');
      expect(room.landlordIndex).toBe(bidder3);
      // 地主手牌应为 17 + 3 = 20 张
      expect(room.hands[bidder3]).toHaveLength(20);
      expect(room.currentPlayerIndex).toBe(bidder3);
    });

    it('should handle all pass → redeal', () => {
      const room = createReadyRoom();
      startBidding(room);
      const startBidder = room.currentBidderIndex;
      const roundBefore = room.currentRound;

      handleBid(room, startBidder, 0);
      const b2 = room.currentBidderIndex;
      handleBid(room, b2, 0);
      const b3 = room.currentBidderIndex;
      handleBid(room, b3, 0);

      // 应该重新发牌
      expect(room.phase).toBe('bidding');
      expect(room.currentRound).toBe(roundBefore + 1);
    });

    it('should reject bid when not your turn', () => {
      const room = createReadyRoom();
      startBidding(room);
      const startBidder = room.currentBidderIndex;
      const other = (startBidder + 1) % 3;

      const result = handleBid(room, other, 1);
      expect('error' in result).toBe(true);
    });

    it('should reject bid lower than current max', () => {
      const room = createReadyRoom();
      startBidding(room);
      const startBidder = room.currentBidderIndex;

      handleBid(room, startBidder, 2);
      const b2 = room.currentBidderIndex;

      const result = handleBid(room, b2, 1);
      expect('error' in result).toBe(true);
    });
  });

  describe('playing flow', () => {
    function roomWithLandlord(): GameRoom {
      const room = createReadyRoom();
      startBidding(room);

      // 让 currentBidderIndex 对应的人叫1分，另外两人不叫
      const b1 = room.currentBidderIndex;
      handleBid(room, b1, 1);
      if (room.phase === 'bidding') {
        const b2 = room.currentBidderIndex;
        handleBid(room, b2, 0);
        if (room.phase === 'bidding') {
          const b3 = room.currentBidderIndex;
          handleBid(room, b3, 0);
        }
      }
      expect(room.phase).toBe('playing');
      return room;
    }

    it('landlord should play first', () => {
      const room = roomWithLandlord();
      const landlord = room.landlordIndex!;

      // 地主出单张
      const card = room.hands[landlord][0];
      const result = handlePlay(room, landlord, [card]);
      if ('error' in result) throw new Error(result.error);
      expect(room.currentPlayerIndex).toBe((landlord - 1 + 3) % 3);
    });

    it('next player can play bigger card or pass', () => {
      const room = roomWithLandlord();
      const landlord = room.landlordIndex!;
      const nextPlayer = (landlord - 1 + 3) % 3;

      // 地主出最大的单张（保证下一个人能找到更大的，如果有的话）
      // 实际上地主手牌最多，出一张较小的牌
      const landlordCard = room.hands[landlord][room.hands[landlord].length - 1]; // 最小的牌
      handlePlay(room, landlord, [landlordCard]);

      // 下一个玩家出更大的单牌
      const biggerCard = room.hands[nextPlayer].find(c => c.value > landlordCard.value);
      if (biggerCard) {
        const result = handlePlay(room, nextPlayer, [biggerCard]);
        if ('error' in result) throw new Error(result.error);
      }
    });

    it('next player can pass', () => {
      const room = roomWithLandlord();
      const landlord = room.landlordIndex!;
      const nextPlayer = (landlord - 1 + 3) % 3;

      // 地主出牌
      const landlordCard = room.hands[landlord][0];
      handlePlay(room, landlord, [landlordCard]);

      // 下一个玩家 pass
      const result = handlePass(room, nextPlayer);
      if ('error' in result) throw new Error(result.error);
      expect(room.passCount).toBe(1);
    });

    it('cannot pass on free play', () => {
      const room = roomWithLandlord();
      const landlord = room.landlordIndex!;

      // 地主首次出牌是自由出牌，不能 pass
      const result = handlePass(room, landlord);
      expect('error' in result).toBe(true);
    });

    it('should reject cards not in hand', () => {
      const room = roomWithLandlord();
      const landlord = room.landlordIndex!;
      const fakeCard: Card = { suit: 'spade', rank: '2', value: 15 };
      // 确认这张牌不在地主手中
      const hasIt = room.hands[landlord].some(c => c.value === 15 && c.suit === 'spade');
      if (!hasIt) {
        const result = handlePlay(room, landlord, [fakeCard]);
        expect('error' in result).toBe(true);
      }
    });

    it('should reject when not your turn', () => {
      const room = roomWithLandlord();
      const landlord = room.landlordIndex!;
      const notMyTurn = (landlord + 1) % 3;

      const result = handlePlay(room, notMyTurn, [room.hands[notMyTurn][0]]);
      expect('error' in result).toBe(true);
    });
  });

  describe('round end and scoring', () => {
    it('should enter scoring phase when a player runs out of cards', () => {
      const room = createReadyRoom();
      startBidding(room);

      // 让某人叫1分
      const b1 = room.currentBidderIndex;
      handleBid(room, b1, 1);
      const b2 = room.currentBidderIndex;
      handleBid(room, b2, 0);
      const b3 = room.currentBidderIndex;
      handleBid(room, b3, 0);

      const landlord = room.landlordIndex!;

      // 模拟地主出完所有牌（作弊式测试：直接把手牌清空）
      // 分批出牌太慢，直接设置手牌为1张然后出掉
      room.hands[landlord] = [room.hands[landlord][0]];

      const result = handlePlay(room, landlord, [room.hands[landlord][0]]);
      if ('error' in result) throw new Error(result.error);

      expect(room.phase).toBe('scoring');
      expect(room.rounds).toHaveLength(1);
      expect(room.rounds[0].landlordIndex).toBe(landlord);
      // 积分变化之和应为0
      const sum = room.rounds[0].scoreChanges.reduce((a, b) => a + b, 0);
      expect(sum).toBe(0);
    });
  });

  describe('nextRound and endGame', () => {
    it('should start next round when host requests', () => {
      const room = createReadyRoom();
      startBidding(room);
      const b1 = room.currentBidderIndex;
      handleBid(room, b1, 1);
      const b2 = room.currentBidderIndex;
      handleBid(room, b2, 0);
      const b3 = room.currentBidderIndex;
      handleBid(room, b3, 0);

      // 地主只有1张牌
      const landlord = room.landlordIndex!;
      room.hands[landlord] = [room.hands[landlord][0]];
      handlePlay(room, landlord, [room.hands[landlord][0]]);

      expect(room.phase).toBe('scoring');

      // 房主请求下一局
      const result = handleNextRound(room, room.hostIndex);
      if ('error' in result) throw new Error(result.error);
      expect(room.phase).toBe('bidding');
      expect(room.currentRound).toBe(2);
    });

    it('should reject nextRound from non-host', () => {
      const room = createReadyRoom();
      startBidding(room);
      const b1 = room.currentBidderIndex;
      handleBid(room, b1, 1);
      const b2 = room.currentBidderIndex;
      handleBid(room, b2, 0);
      const b3 = room.currentBidderIndex;
      handleBid(room, b3, 0);
      const landlord = room.landlordIndex!;
      room.hands[landlord] = [room.hands[landlord][0]];
      handlePlay(room, landlord, [room.hands[landlord][0]]);

      const nonHost = (room.hostIndex + 1) % 3;
      const result = handleNextRound(room, nonHost);
      expect('error' in result).toBe(true);
    });

    it('should end game when host requests from scoring', () => {
      const room = createReadyRoom();
      const result = handleEndGame(room, room.hostIndex);
      if ('error' in result) throw new Error(result.error);
      expect(room.phase).toBe('finished');
    });

    it('should reject endGame from non-host', () => {
      const room = createReadyRoom();
      const nonHost = (room.hostIndex + 1) % 3;
      const result = handleEndGame(room, nonHost);
      expect('error' in result).toBe(true);
    });
  });

  describe('protocol test', () => {
    it('parseClientMessage should parse valid join', async () => {
      const { parseClientMessage } = await import('../protocol');
      const msg = parseClientMessage(JSON.stringify({ type: 'join', nickname: 'Alice' }));
      expect(msg).toEqual({ type: 'join', nickname: 'Alice' });
    });

    it('parseClientMessage should reject invalid nickname', async () => {
      const { parseClientMessage } = await import('../protocol');
      expect(parseClientMessage(JSON.stringify({ type: 'join', nickname: '' }))).toBeNull();
      const long = 'A'.repeat(11);
      expect(parseClientMessage(JSON.stringify({ type: 'join', nickname: long }))).toBeNull();
    });

    it('parseClientMessage should reject invalid bid', async () => {
      const { parseClientMessage } = await import('../protocol');
      expect(parseClientMessage(JSON.stringify({ type: 'bid', bid: 5 }))).toBeNull();
      expect(parseClientMessage(JSON.stringify({ type: 'bid', bid: -1 }))).toBeNull();
    });

    it('parseClientMessage should reject invalid JSON', async () => {
      const { parseClientMessage } = await import('../protocol');
      expect(parseClientMessage('not json')).toBeNull();
      expect(parseClientMessage('')).toBeNull();
    });

    it('parseClientMessage should parse all valid message types', async () => {
      const { parseClientMessage } = await import('../protocol');
      expect(parseClientMessage('{"type":"ready"}')).toEqual({ type: 'ready' });
      expect(parseClientMessage('{"type":"pass"}')).toEqual({ type: 'pass' });
      expect(parseClientMessage('{"type":"nextRound"}')).toEqual({ type: 'nextRound' });
      expect(parseClientMessage('{"type":"endGame"}')).toEqual({ type: 'endGame' });
      expect(parseClientMessage('{"type":"ping"}')).toEqual({ type: 'ping' });
      expect(parseClientMessage('{"type":"bid","bid":2}')).toEqual({ type: 'bid', bid: 2 });
      expect(parseClientMessage('{"type":"play","cards":[{"suit":"spade","rank":"3","value":3}]}')).not.toBeNull();
    });
  });
});
