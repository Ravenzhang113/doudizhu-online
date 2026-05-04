import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useGame } from '../hooks/useGame';
import { loadNickname } from '../utils/storage';
import HandCards from '../components/HandCards';
import PlayerPanel from '../components/PlayerPanel';
import PlayArea from '../components/PlayArea';
import ActionBar from '../components/ActionBar';

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const nickname = loadNickname();
  const game = useGame(roomId || '', nickname);

  const {
    roomState, myHand, isConnected, isMyTurn, isFree, isHost,
    mySeatIndex, nextPlayerSeat, prevPlayerSeat,
    selectedCards, bidResults, lastPlayInfo, error,
    ready, bid, play, pass, nextRound, endGame,
    toggleCard, getSelectedCards, clearSelection,
  } = game;

  const phase = roomState?.phase || 'waiting';
  const isLandscape = phase === 'bidding' || phase === 'playing' || phase === 'scoring';

  // 尝试锁定横屏
  useEffect(() => {
    if (isLandscape) {
      try {
        (screen.orientation as any)?.lock?.('landscape');
      } catch {}
    }
  }, [isLandscape]);

  // 等待连接
  if (!roomState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="panel p-6 text-center">
          {!isConnected ? '连接中...' : '等待房间状态...'}
        </div>
      </div>
    );
  }

  // 等待阶段（竖屏）
  if (phase === 'waiting') {
    return <WaitingLobby roomState={roomState} mySeatIndex={mySeatIndex} isHost={isHost} ready={ready} />;
  }

  // 游戏阶段（横屏布局）
  const players = roomState.players;
  const nextPlayer = players[nextPlayerSeat];
  const prevPlayer = players[prevPlayerSeat];

  // 当前叫分最高分
  const currentMaxBid = Math.max(0, ...Array.from(bidResults.values()));

  // 出牌区信息
  const playAreaCards = lastPlayInfo?.cards || roomState.lastPlay?.cards || [];
  const playAreaHandType = lastPlayInfo?.handType || roomState.lastPlay?.handType || null;
  const playAreaFree = isFree && phase === 'playing';

  // 叫分结果文字
  const getBidText = (seat: number): string | undefined => {
    const b = bidResults.get(seat);
    if (b === undefined) return undefined;
    if (b === 0) return '不叫';
    return `叫${b}分`;
  };

  // 结算阶段分数
  const lastRound = roomState.totalScores;

  return (
    <div className="landscape-container">
      {/* 左侧 - 下家 */}
      <div className="flex items-center justify-center" style={{ width: '15%' }}>
        {prevPlayer && (
          <PlayerPanel
            nickname={prevPlayer.nickname}
            handCount={phase === 'playing' ? roomState.handCounts[prevPlayerSeat] : undefined}
            isLandlord={roomState.landlordIndex === prevPlayerSeat}
            bidResult={phase === 'bidding' ? getBidText(prevPlayerSeat) : undefined}
            scoreChange={phase === 'scoring' ? 0 : undefined}
            totalScore={phase === 'scoring' ? lastRound[prevPlayerSeat] : undefined}
            isOnline={prevPlayer.isConnected}
            side="left"
          />
        )}
      </div>

      {/* 中间区域 */}
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* 上方信息 */}
        <div className="text-center">
          {phase === 'bidding' && (
            <div className="text-cream text-lg font-bold">
              {isMyTurn ? '轮到你叫分' : `等待 ${players[roomState.currentBidderIndex]?.nickname} 叫分`}
            </div>
          )}
          {phase === 'playing' && !playAreaFree && (
            <PlayArea
              cards={playAreaCards}
              handType={playAreaHandType}
              playerName={playAreaCards.length > 0 ? players[lastPlayInfo?.seatIndex ?? roomState.lastPlay?.seatIndex ?? 0]?.nickname : undefined}
            />
          )}
          {phase === 'playing' && playAreaFree && (
            <PlayArea cards={[]} handType={null} isFree />
          )}
          {phase === 'scoring' && (
            <div className="panel p-4 text-center">
              <div className="text-lg font-bold mb-2">第 {roomState.roundNumber} 局结算</div>
              <div className="flex gap-4 justify-center">
                {players.map((p, i) => p && (
                  <div key={i} className="text-center">
                    <div className="font-bold text-sm">{p.nickname} {roomState.landlordIndex === i ? '👑' : ''}</div>
                    <div className={`text-xl font-bold ${lastRound[i] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {lastRound[i]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 手牌 */}
        {phase !== 'scoring' && (
          <HandCards
            cards={myHand}
            selectedIndices={selectedCards}
            onToggle={toggleCard}
            disabled={!isMyTurn}
          />
        )}

        {/* 操作按钮 */}
        <ActionBar
          phase={phase as any}
          isMyTurn={isMyTurn}
          isFree={isFree}
          isHost={isHost}
          currentMaxBid={currentMaxBid}
          onBid={bid}
          onPlay={() => {
            const cards = getSelectedCards();
            if (cards.length > 0) {
              play(cards);
              clearSelection();
            }
          }}
          onPass={() => { pass(); clearSelection(); }}
          onNextRound={nextRound}
          onEndGame={endGame}
          canPlay={getSelectedCards().length > 0}
          selectedCount={getSelectedCards().length}
        />
      </div>

      {/* 右侧 - 上家 */}
      <div className="flex items-center justify-center" style={{ width: '15%' }}>
        {nextPlayer && (
          <PlayerPanel
            nickname={nextPlayer.nickname}
            handCount={phase === 'playing' ? roomState.handCounts[nextPlayerSeat] : undefined}
            isLandlord={roomState.landlordIndex === nextPlayerSeat}
            bidResult={phase === 'bidding' ? getBidText(nextPlayerSeat) : undefined}
            scoreChange={phase === 'scoring' ? 0 : undefined}
            totalScore={phase === 'scoring' ? lastRound[nextPlayerSeat] : undefined}
            isOnline={nextPlayer.isConnected}
            side="right"
          />
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg z-50">
          {error}
        </div>
      )}
    </div>
  );
}

// 等待大厅组件
function WaitingLobby({ roomState, mySeatIndex, isHost, ready }: {
  roomState: any;
  mySeatIndex: number;
  isHost: boolean;
  ready: () => void;
}) {
  const allReady = roomState.players.every((p: any) => p !== null && p.isReady);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomState.roomId);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
      <div className="panel p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">房间: {roomState.roomId}</h2>
          <button className="btn-outline px-3 py-1 text-sm" onClick={copyRoomId}>
            复制
          </button>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          {roomState.players.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center font-bold text-sm">
                  {p ? p.nickname[0] : '?'}
                </span>
                <span className="font-bold">{p ? p.nickname : '等待加入...'}</span>
                {isHost && i === roomState.hostIndex && (
                  <span className="text-xs bg-amber-200 px-2 py-0.5 rounded">房主</span>
                )}
              </div>
              {p && (
                <span className={`text-sm ${p.isReady ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
                  {p.isReady ? '已准备' : '未准备'}
                </span>
              )}
            </div>
          ))}
        </div>

        {mySeatIndex >= 0 && !roomState.players[mySeatIndex].isReady && (
          <button className="btn-gold w-full py-3 text-lg" onClick={ready}>
            准备
          </button>
        )}

        {isHost && allReady && (
          <button className="btn-gold w-full py-3 text-lg" onClick={ready}>
            开始游戏
          </button>
        )}
      </div>
    </div>
  );
}
