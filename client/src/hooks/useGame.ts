import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import type { Card, HandType } from '@shared/types';

interface PlayerInfo {
  nickname: string;
  seatIndex: number;
  isConnected: boolean;
  isReady: boolean;
}

interface RoomState {
  roomId: string;
  players: (PlayerInfo | null)[];
  phase: string;
  landlordIndex: number | null;
  currentPlayerIndex: number;
  currentBidderIndex: number;
  lastPlay: { seatIndex: number; cards: Card[]; handType: HandType | null } | null;
  passCount: number;
  handCounts: [number, number, number];
  totalScores: [number, number, number];
  roundNumber: number;
  hostIndex: number;
  settings: any;
  mySeatIndex: number;
}

export function useGame(roomId: string, nickname: string) {
  const { send, on, isConnected } = useWebSocket(roomId, nickname);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myHand, setMyHand] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
  const [bidResults, setBidResults] = useState<Map<number, number>>(new Map());
  const [threeCards, setThreeCards] = useState<Card[]>([]);
  const [lastPlayInfo, setLastPlayInfo] = useState<{ seatIndex: number; cards: Card[]; handType: HandType | null } | null>(null);
  const [error, setError] = useState<string>('');

  // 消息处理
  useEffect(() => {
    on('roomState', (msg) => {
      setRoomState(msg.state);
      setError('');
    });

    on('hand', (msg) => {
      setMyHand(msg.cards);
      setSelectedCards(new Set());
    });

    on('bidResult', (msg) => {
      setBidResults(prev => new Map(prev).set(msg.seatIndex, msg.bid));
    });

    on('playResult', (msg) => {
      setLastPlayInfo({ seatIndex: msg.seatIndex, cards: msg.cards, handType: msg.handType });
    });

    on('passResult', (msg) => {
      setLastPlayInfo({ seatIndex: msg.seatIndex, cards: [], handType: null });
    });

    on('showThreeCards', (msg) => {
      setThreeCards(msg.cards);
    });

    on('roundResult', () => {
      setBidResults(new Map());
      setThreeCards([]);
      setLastPlayInfo(null);
    });

    on('error', (msg) => {
      setError(msg.message);
      setTimeout(() => setError(''), 3000);
    });
  }, [on]);

  // 派生状态
  const mySeatIndex = roomState?.mySeatIndex ?? -1;
  const isMyTurn = roomState
    ? (roomState.phase === 'bidding' && roomState.currentBidderIndex === mySeatIndex) ||
      (roomState.phase === 'playing' && roomState.currentPlayerIndex === mySeatIndex)
    : false;
  const isFree = roomState
    ? roomState.lastPlay === null || roomState.lastPlay.seatIndex === mySeatIndex || roomState.passCount >= 2
    : true;
  const isHost = roomState?.hostIndex === mySeatIndex;

  // 上家/下家（逆时针）
  const nextPlayerSeat = mySeatIndex >= 0 ? (mySeatIndex - 1 + 3) % 3 : -1;
  const prevPlayerSeat = mySeatIndex >= 0 ? (mySeatIndex + 1) % 3 : -1;

  // 操作方法
  const ready = useCallback(() => send({ type: 'ready' }), [send]);
  const bid = useCallback((b: 0|1|2|3) => send({ type: 'bid', bid: b }), [send]);
  const play = useCallback((cards: Card[]) => send({ type: 'play', cards }), [send]);
  const pass = useCallback(() => send({ type: 'pass' }), [send]);
  const nextRound = useCallback(() => send({ type: 'nextRound' }), [send]);
  const endGame = useCallback(() => send({ type: 'endGame' }), [send]);

  // 选牌
  const toggleCard = useCallback((index: number) => {
    setSelectedCards(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const getSelectedCards = useCallback((): Card[] => {
    return Array.from(selectedCards).sort((a, b) => a - b).map(i => myHand[i]);
  }, [selectedCards, myHand]);

  const clearSelection = useCallback(() => setSelectedCards(new Set()), []);

  return {
    roomState, myHand, isConnected, isMyTurn, isFree, isHost,
    mySeatIndex, nextPlayerSeat, prevPlayerSeat,
    selectedCards, bidResults, threeCards, lastPlayInfo, error,
    ready, bid, play, pass, nextRound, endGame,
    toggleCard, getSelectedCards, clearSelection,
  };
}
