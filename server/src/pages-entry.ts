/**
 * Pages Worker 入口
 * 处理 /api/* 路由，其他路由交给 ASSETS（静态资源）
 */
import { GameRoom } from './GameRoom';

export { GameRoom };

interface Env {
  GAME_ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // API 路由
    if (url.pathname.startsWith('/api/')) {
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      // CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
      }

      // 创建房间
      if (url.pathname === '/api/create-room' && request.method === 'POST') {
        const roomId = generateRoomId();
        const id = env.GAME_ROOM.idFromName(roomId);
        const stub = env.GAME_ROOM.get(id);
        const response = await stub.fetch(new Request(request.url, { method: 'POST' }));
        const data = await response.json<{ roomId: string }>();
        return new Response(JSON.stringify(data), {
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      // WebSocket 连接
      if (url.pathname === '/api/ws' && request.headers.get('Upgrade') === 'websocket') {
        const roomId = url.searchParams.get('room');
        if (!roomId) {
          return new Response('Missing room parameter', { status: 400 });
        }
        const id = env.GAME_ROOM.idFromName(roomId);
        const stub = env.GAME_ROOM.get(id);
        return stub.fetch(request);
      }

      return new Response('Not found', { status: 404 });
    }

    // SPA 路由：所有非 /api 路由返回 index.html
    const response = await env.ASSETS.fetch(request);
    if (response.status === 404) {
      return env.ASSETS.fetch(new Request(new URL('/index.html', url.origin).toString(), request));
    }
    return response;
  },
};

function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
