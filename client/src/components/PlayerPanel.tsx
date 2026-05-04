interface Props {
  nickname: string;
  handCount?: number;
  isLandlord?: boolean;
  bidResult?: string;
  scoreChange?: number;
  totalScore?: number;
  isOnline?: boolean;
  side: 'left' | 'right';
}

export default function PlayerPanel({
  nickname, handCount, isLandlord, bidResult, scoreChange, totalScore, isOnline, side,
}: Props) {
  return (
    <div className="panel flex flex-col items-center gap-1 p-3 min-w-[90px] text-center">
      {/* 昵称 + 地主标记 */}
      <div className="flex items-center gap-1">
        <span className="font-bold text-sm truncate max-w-[70px]">{nickname}</span>
        {isLandlord && <span className="text-lg">👑</span>}
      </div>

      {/* 在线状态 */}
      <div className="flex items-center gap-1">
        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
        <span className="text-xs text-gray-500">{isOnline ? '在线' : '离线'}</span>
      </div>

      {/* 手牌数 */}
      {handCount !== undefined && (
        <div className="text-sm text-gray-600">
          <span className="font-bold text-base">{handCount}</span> 张
        </div>
      )}

      {/* 叫分结果 */}
      {bidResult && (
        <div className="text-sm font-bold text-amber-700">{bidResult}</div>
      )}

      {/* 得分 */}
      {scoreChange !== undefined && totalScore !== undefined && (
        <div className="mt-1">
          <div className={`text-lg font-bold ${scoreChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {scoreChange >= 0 ? '+' : ''}{scoreChange}
          </div>
          <div className="text-xs text-gray-500">总: {totalScore}</div>
        </div>
      )}
    </div>
  );
}
