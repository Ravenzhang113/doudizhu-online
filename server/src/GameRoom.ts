/**
 * Durable Object — 游戏房间
 * 每个房间一个实例，管理 WebSocket 连接和游戏状态
 */
import type { GameRoom as GameRoomState, Card, ServerMessage, ClientMessage } from '@shared/types';
import { parseClientMessage, serializeServerMessage } from './protocol';
import { identifyHand } from './game/handType';
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
} from './game/engine';
import { countBombs, detectSpring, calculateScore } from './game/scoring';

interface ClientConnection {
  webSocket: WebSocket;
  sessionId: string;
  seatIndex: number;
  nickname: string;
}

export class GameRoom {
  private state: DurableObjectState;
  private room: GameRoomState | null = null;
  private connections: Map<string, ClientConnection> = new Map();
  // 本局出牌历史（用于春天检测和回放）
  private currentPlayHistory: import('@shared/types').PlayRecord[] = [];

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    // 从存储恢复状态
    if (!this.room) {
      const stored = await this.state.storage.get<GameRoomState>('gameRoom');
      if (stored) this.room = stored;
    }

    // WebSocket 升级
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader && upgradeHeader === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

      // 生成 sessionId
      const sessionId = crypto.randomUUID();

      this.state.acceptWebSocket(server);
      (server as any).__sessionId = sessionId;

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // 创建房间（POST /create）
    if (request.method === 'POST') {
      if (!this.room) {
        const roomId = this.generateRoomId();
        this.room = createRoom(roomId);
        await this.saveState();
        return new Response(JSON.stringify({ roomId: this.room.id }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ roomId: this.room.id }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 获取房间状态
    if (this.room) {
      return new Response(JSON.stringify({ roomId: this.room.id, phase: this.room.phase }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string) {
    if (!this.room) return;

    const sessionId = (ws as any).__sessionId as string;
    const msg = parseClientMessage(message);

    if (msg === null) {
      this.sendTo(ws, { type: 'error', message: '无效消息' });
      return;
    }

    switch (msg.type) {
      case 'join':
        this.handleJoin(ws, sessionId, msg.nickname);
        break;
      case 'ready':
        this.handleReady(ws, sessionId);
        break;
      case 'bid':
        this.handleBidMsg(ws, sessionId, msg.bid);
        break;
      case 'play':
        this.handlePlayMsg(ws, sessionId, msg.cards);
        break;
      case 'pass':
        this.handlePassMsg(ws, sessionId);
        break;
      case 'nextRound':
        this.handleNextRoundMsg(ws, sessionId);
        break;
      case 'endGame':
        this.handleEndGameMsg(ws, sessionId);
        break;
      case 'ping':
        this.sendTo(ws, { type: 'pong' });
        break;
    }
  }

  async webSocketClose(ws: WebSocket) {
    const sessionId = (ws as any).__sessionId as string;
    const conn = this.connections.get(sessionId);
    if (!conn || !this.room) return;

    // 标记断线
    const player = this.room.players[conn.seatIndex];
    if (player) {
      this.room.players[conn.seatIndex] = { ...player, isConnected: false };
    }
    this.connections.delete(sessionId);
    this.broadcastRoomState();
    await this.saveState();
  }

  private handleJoin(ws: WebSocket, sessionId: string, nickname: string) {
    if (!this.room) return;

    const result = joinRoom(this.room, sessionId, nickname);
    if ('error' in result) {
      this.sendTo(ws, { type: 'error', message: result.error });
      return;
    }

    this.room = result.room;
    const seatIndex = result.seatIndex;

    this.connections.set(sessionId, { webSocket: ws, sessionId, seatIndex, nickname });

    // 发送手牌（如果已在游戏中）
    if (this.room.phase !== 'waiting') {
      this.sendTo(ws, {
        type: 'hand',
        cards: this.room.hands[seatIndex],
        seatIndex,
      });
    }

    this.sendTo(ws, { type: 'roomState', state: this.getPublicState(seatIndex) });
    this.broadcastRoomState();
    this.saveState();
  }

  private handleReady(ws: WebSocket, sessionId: string) {
    if (!this.room) return;
    const conn = this.connections.get(sessionId);
    if (!conn) return;

    const result = playerReady(this.room, conn.seatIndex);
    if ('error' in result) {
      this.sendTo(ws, { type: 'error', message: result.error });
      return;
    }

    this.room = result;
    this.broadcastRoomState();

    // 检查是否全部准备
    if (allReady(this.room)) {
      this.room = startBidding(this.room);
      this.currentPlayHistory = [];

      // 发送手牌给每个玩家
      for (const [sid, c] of this.connections) {
        this.sendTo(c.webSocket, {
          type: 'hand',
          cards: this.room!.hands[c.seatIndex],
          seatIndex: c.seatIndex,
        });
      }

      this.broadcastRoomState();
    }

    this.saveState();
  }

  private handleBidMsg(ws: WebSocket, sessionId: string, bid: 0 | 1 | 2 | 3) {
    if (!this.room) return;
    const conn = this.connections.get(sessionId);
    if (!conn) return;

    const prevPhase = this.room.phase;
    const result = handleBid(this.room, conn.seatIndex, bid);

    if ('error' in result) {
      this.sendTo(ws, { type: 'error', message: result.error });
      return;
    }

    this.room = result;

    // 广播叫分结果
    this.broadcast({
      type: 'bidResult',
      seatIndex: conn.seatIndex,
      bid,
    });

    // 如果进入出牌阶段，展示底牌
    if (prevPhase === 'bidding' && this.room.phase === 'playing') {
      this.broadcast({
        type: 'showThreeCards',
        cards: this.room.threeCards,
      });

      // 给地主发送底牌加入后的新手牌
      const landlordConn = this.findConnectionBySeat(this.room.landlordIndex!);
      if (landlordConn) {
        this.sendTo(landlordConn.webSocket, {
          type: 'hand',
          cards: this.room.hands[this.room.landlordIndex!],
          seatIndex: this.room.landlordIndex!,
        });
      }
    }

    this.broadcastRoomState();
    this.saveState();
  }

  private handlePlayMsg(ws: WebSocket, sessionId: string, cards: Card[]) {
    if (!this.room) return;
    const conn = this.connections.get(sessionId);
    if (!conn) return;

    const prevPhase = this.room.phase;
    const result = handlePlay(this.room, conn.seatIndex, cards);

    if ('error' in result) {
      this.sendTo(ws, { type: 'error', message: result.error });
      return;
    }

    this.room = result;

    // 记录出牌历史
    const playRecord: import('@shared/types').PlayRecord = {
      seatIndex: conn.seatIndex,
      cards,
      handType: null,
      isPass: false,
      timestamp: new Date().toISOString(),
    };
    // 识别牌型
    const hand = cards.length > 0 ? (() => { const h = identifyHand(cards); return h?.type ?? null; })() : null;
    playRecord.handType = hand;
    this.currentPlayHistory.push(playRecord);

    // 广播出牌结果
    this.broadcast({
      type: 'playResult',
      seatIndex: conn.seatIndex,
      cards,
      handType: hand,
    });

    // 发送更新后的手牌给出牌者
    this.sendTo(ws, {
      type: 'hand',
      cards: this.room.hands[conn.seatIndex],
      seatIndex: conn.seatIndex,
    });

    // 如果进入结算阶段
    if (prevPhase === 'playing' && this.room.phase === 'scoring') {
      this.finalizeRound();
    }

    this.broadcastRoomState();
    this.saveState();
  }

  private handlePassMsg(ws: WebSocket, sessionId: string) {
    if (!this.room) return;
    const conn = this.connections.get(sessionId);
    if (!conn) return;

    const result = handlePass(this.room, conn.seatIndex);

    if ('error' in result) {
      this.sendTo(ws, { type: 'error', message: result.error });
      return;
    }

    this.room = result;

    // 记录 pass
    this.currentPlayHistory.push({
      seatIndex: conn.seatIndex,
      cards: [],
      handType: null,
      isPass: true,
      timestamp: new Date().toISOString(),
    });

    this.broadcast({
      type: 'passResult',
      seatIndex: conn.seatIndex,
    });

    this.broadcastRoomState();
    this.saveState();
  }

  private handleNextRoundMsg(ws: WebSocket, sessionId: string) {
    if (!this.room) return;
    const conn = this.connections.get(sessionId);
    if (!conn) return;

    const result = handleNextRound(this.room, conn.seatIndex);
    if ('error' in result) {
      this.sendTo(ws, { type: 'error', message: result.error });
      return;
    }

    this.room = result;
    this.currentPlayHistory = [];

    // 发送新一手牌
    for (const [, c] of this.connections) {
      this.sendTo(c.webSocket, {
        type: 'hand',
        cards: this.room!.hands[c.seatIndex],
        seatIndex: c.seatIndex,
      });
    }

    this.broadcastRoomState();
    this.saveState();
  }

  private handleEndGameMsg(ws: WebSocket, sessionId: string) {
    if (!this.room) return;
    const conn = this.connections.get(sessionId);
    if (!conn) return;

    const result = handleEndGame(this.room, conn.seatIndex);
    if ('error' in result) {
      this.sendTo(ws, { type: 'error', message: result.error });
      return;
    }

    this.room = result;
    this.broadcastRoomState();
    this.saveState();
  }

  /**
   * 结算一局 — 计算春天等并更新 RoundResult
   */
  private finalizeRound() {
    if (!this.room) return;

    const lastRound = this.room.rounds[this.room.rounds.length - 1];
    if (!lastRound) return;

    // 重新计算春天
    const isSpring = detectSpring(this.currentPlayHistory, lastRound.landlordIndex, lastRound.winnerTeam);

    // 重新计算积分（含春天）
    const { finalScore, scoreChanges } = calculateScore(
      lastRound.bidScore,
      lastRound.bombCount,
      isSpring,
      lastRound.winnerTeam,
      lastRound.landlordIndex
    );

    // 更新 RoundResult
    lastRound.isSpring = isSpring;
    lastRound.multiplier = finalScore / lastRound.bidScore;
    lastRound.finalScore = finalScore;
    lastRound.scoreChanges = scoreChanges;
    lastRound.playHistory = [...this.currentPlayHistory];

    // 重新计算累计积分（减去旧值加上新值）
    // 因为 handleRoundEnd 已经加了旧的 scoreChanges，需要先减
    for (let i = 0; i < 3; i++) {
      this.room.totalScores[i] -= lastRound.scoreChanges[i]; // 减去旧的（但这已经是新的了）
    }
    // 实际上 engine.ts 中的 handleRoundEnd 用的是不含春天的 scoreChanges
    // 我们这里需要纠正：直接重置 totalScores
    // 用 rounds 重新计算
    this.room.totalScores = [0, 0, 0];
    for (const round of this.room.rounds) {
      for (let i = 0; i < 3; i++) {
        this.room.totalScores[i] += round.scoreChanges[i];
      }
    }

    // 广播结算结果
    this.broadcast({
      type: 'roundResult',
      result: lastRound,
    });
  }

  // === 工具方法 ===

  private generateRoomId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }

  private getPublicState(forSeatIndex?: number): unknown {
    if (!this.room) return null;
    return {
      roomId: this.room.id,
      players: this.room.players.map((p, i) =>
        p ? { nickname: p.nickname, seatIndex: i, isConnected: p.isConnected, isReady: p.isReady } : null
      ),
      phase: this.room.phase,
      landlordIndex: this.room.landlordIndex,
      currentPlayerIndex: this.room.currentPlayerIndex,
      currentBidderIndex: this.room.currentBidderIndex,
      lastPlay: this.room.lastPlay,
      passCount: this.room.passCount,
      handCounts: this.room.hands.map((h) => h.length),
      totalScores: this.room.totalScores,
      roundNumber: this.room.currentRound,
      hostIndex: this.room.hostIndex,
      settings: this.room.settings,
      mySeatIndex: forSeatIndex,
    };
  }

  private broadcastRoomState() {
    if (!this.room) return;
    for (const [, conn] of this.connections) {
      this.sendTo(conn.webSocket, {
        type: 'roomState',
        state: this.getPublicState(conn.seatIndex),
      });
    }
  }

  private broadcast(msg: ServerMessage) {
    const data = serializeServerMessage(msg);
    for (const [, conn] of this.connections) {
      try {
        conn.webSocket.send(data);
      } catch {
        // 连接已关闭，忽略
      }
    }
  }

  private sendTo(ws: WebSocket, msg: ServerMessage) {
    try {
      ws.send(serializeServerMessage(msg));
    } catch {
      // 连接已关闭
    }
  }

  private findConnectionBySeat(seatIndex: number): ClientConnection | undefined {
    for (const [, conn] of this.connections) {
      if (conn.seatIndex === seatIndex) return conn;
    }
    return undefined;
  }

  private async saveState() {
    if (this.room) {
      await this.state.storage.put('gameRoom', this.room);
    }
  }
}

