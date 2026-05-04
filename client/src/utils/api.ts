// API 和 WebSocket 使用同域名（Pages 统一部署）
export function getApiUrl(path: string): string {
  return path;
}

export function getWsUrl(roomId: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/ws?room=${roomId}`;
}
