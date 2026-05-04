import { useRef, useEffect, useState, useCallback } from 'react';

type MessageHandler = (data: any) => void;

export function useWebSocket(roomId: string, nickname: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, MessageHandler[]>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimer = useRef<number>(0);
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    if (!roomId || !nickname) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws?room=${roomId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      // 发送 join 消息
      ws.send(JSON.stringify({ type: 'join', nickname }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const type = msg.type;
        const handlers = handlersRef.current.get(type) || [];
        handlers.forEach(h => h(msg));
      } catch {}
    };

    ws.onclose = () => {
      setIsConnected(false);
      // 自动重连（指数退避）
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectTimer.current = window.setTimeout(() => {
        reconnectAttempts.current++;
        connect();
      }, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [roomId, nickname]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // 心跳
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const on = useCallback((type: string, handler: MessageHandler) => {
    const handlers = handlersRef.current.get(type) || [];
    handlers.push(handler);
    handlersRef.current.set(type, handlers);
  }, []);

  return { send, on, isConnected };
}
