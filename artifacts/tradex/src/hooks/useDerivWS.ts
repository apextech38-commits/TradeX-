import { useState, useEffect, useCallback, useRef } from 'react';

const DERIV_APP_ID = "339nn77Xa7qUHK0CbknRG";
const WS_URL = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;

export interface Tick {
  epoch: number;
  quote: number;
  symbol: string;
}

export function useDerivWS() {
  const [isConnected, setIsConnected] = useState(false);
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [latestTick, setLatestTick] = useState<Tick | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const activeSymbolRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      if (activeSymbolRef.current) {
        ws.send(JSON.stringify({ ticks: activeSymbolRef.current, subscribe: 1 }));
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setTimeout(connect, 3000); // Reconnect
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.msg_type === 'tick') {
        const newTick: Tick = {
          epoch: data.tick.epoch,
          quote: data.tick.quote,
          symbol: data.tick.symbol,
        };
        setLatestTick(newTick);
        setTicks(prev => {
          const updated = [...prev, newTick];
          if (updated.length > 5000) return updated.slice(-5000); // Keep max 5000 ticks
          return updated;
        });
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const subscribe = useCallback((symbol: string) => {
    activeSymbolRef.current = symbol;
    setTicks([]); // Clear old ticks
    setLatestTick(null);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
    }
  }, []);

  const unsubscribe = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && activeSymbolRef.current) {
      wsRef.current.send(JSON.stringify({ forget_all: 'ticks' }));
      activeSymbolRef.current = null;
    }
  }, []);

  return { ticks, latestTick, isConnected, subscribe, unsubscribe };
}
