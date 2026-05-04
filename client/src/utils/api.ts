// API 基础 URL — 指向 Cloudflare Worker
const API_BASE = 'https://doudizhu-online.ravenzhang113.workers.dev';

export function getApiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export function getWsUrl(roomId: string): string {
  return `wss://doudizhu-online.ravenzhang113.workers.dev/api/ws?room=${roomId}`;
}
