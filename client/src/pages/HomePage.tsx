import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadNickname, saveNickname } from '../utils/storage';

export default function HomePage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(loadNickname());
  const [roomCode, setRoomCode] = useState('');

  const handleCreate = async () => {
    if (!nickname.trim()) return;
    saveNickname(nickname.trim());
    const res = await fetch('/api/create-room', { method: 'POST' });
    const data = await res.json();
    if (data.roomId) {
      navigate(`/room/${data.roomId}`);
    }
  };

  const handleJoin = () => {
    if (!nickname.trim() || !roomCode.trim()) return;
    saveNickname(nickname.trim());
    navigate(`/room/${roomCode.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-6">
      <h1 className="text-3xl font-black text-cream">斗地主在线对战</h1>

      <div className="panel w-full max-w-sm flex flex-col gap-4">
        <div>
          <label className="text-sm text-gray-600 mb-1 block">昵称</label>
          <input
            className="input-field"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="输入你的昵称"
            maxLength={10}
          />
        </div>

        <button
          className="btn-gold w-full py-3 text-lg"
          onClick={handleCreate}
          disabled={!nickname.trim()}
        >
          创建房间
        </button>

        <div className="flex items-center gap-2">
          <div className="h-px bg-gray-300 flex-1" />
          <span className="text-gray-400 text-sm">或</span>
          <div className="h-px bg-gray-300 flex-1" />
        </div>

        <div className="flex gap-2">
          <input
            className="input-field flex-1"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="匹配码"
            maxLength={6}
          />
          <button
            className="btn-gold px-4"
            onClick={handleJoin}
            disabled={!nickname.trim() || !roomCode.trim()}
          >
            加入
          </button>
        </div>
      </div>
    </div>
  );
}
