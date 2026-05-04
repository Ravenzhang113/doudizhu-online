interface Props {
  phase: 'bidding' | 'playing' | 'scoring' | 'waiting';
  isMyTurn: boolean;
  isFree: boolean;
  isHost: boolean;
  currentMaxBid: number;
  onBid: (bid: 0|1|2|3) => void;
  onPlay: () => void;
  onPass: () => void;
  onNextRound: () => void;
  onEndGame: () => void;
  canPlay?: boolean;
  selectedCount?: number;
}

export default function ActionBar({
  phase, isMyTurn, isFree, isHost, currentMaxBid,
  onBid, onPlay, onPass, onNextRound, onEndGame, canPlay, selectedCount,
}: Props) {
  // 叫分阶段
  if (phase === 'bidding' && isMyTurn) {
    const buttons: { bid: 0|1|2|3; label: string; disabled: boolean }[] = [
      { bid: 0, label: '不叫', disabled: false },
      { bid: 1, label: '1分', disabled: currentMaxBid >= 1 },
      { bid: 2, label: '2分', disabled: currentMaxBid >= 2 },
      { bid: 3, label: '3分', disabled: currentMaxBid >= 3 },
    ];
    return (
      <div className="flex gap-3 justify-center">
        {buttons.map(b => (
          <button
            key={b.bid}
            className={`btn-gold px-5 py-2 text-base ${b.disabled ? 'opacity-30 !cursor-not-allowed' : ''}`}
            onClick={() => onBid(b.bid)}
            disabled={b.disabled}
          >
            {b.label}
          </button>
        ))}
      </div>
    );
  }

  // 出牌阶段
  if (phase === 'playing' && isMyTurn) {
    return (
      <div className="flex gap-3 justify-center">
        {!isFree && (
          <button className="btn-outline px-6 py-2" onClick={onPass}>不出</button>
        )}
        <button
          className={`btn-gold px-6 py-2 ${canPlay ? '' : 'opacity-30 !cursor-not-allowed'}`}
          onClick={onPlay}
          disabled={!canPlay}
        >
          出牌{selectedCount ? `(${selectedCount}张)` : ''}
        </button>
      </div>
    );
  }

  // 结算阶段
  if (phase === 'scoring' && isHost) {
    return (
      <div className="flex gap-3 justify-center">
        <button className="btn-gold px-6 py-2" onClick={onNextRound}>下一局</button>
        <button className="btn-red px-6 py-2" onClick={onEndGame}>结束游戏</button>
      </div>
    );
  }

  return null;
}
