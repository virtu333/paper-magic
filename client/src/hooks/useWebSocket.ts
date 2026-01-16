import { useCallback, useRef, useState } from 'react';
import type { ClientMessage, ServerMessage } from '@paper-magic/shared';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export function useWebSocket() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<ServerMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback((url: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected');
      setStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        console.log('[WS] Received:', message);
        setLastMessage(message);
      } catch (error) {
        console.error('[WS] Failed to parse message:', error);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
      setStatus('disconnected');
      wsRef.current = null;
    };

    ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
  }, []);

  const sendMessage = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.warn('[WS] Cannot send - not connected');
      return false;
    }

    wsRef.current.send(JSON.stringify(message));
    console.log('[WS] Sent:', message);
    return true;
  }, []);

  return {
    status,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
  };
}
