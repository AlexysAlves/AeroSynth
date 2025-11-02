import { useEffect, useRef } from "react";

export default function useNotifications(onMessage) {
  const wsRef = useRef(null);
  useEffect(() => {
    const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const wsUrl = API.replace(/^http/, "ws") + "/ws";
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => console.log("ws opened");
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        onMessage && onMessage(data);
      } catch (err) {
        console.error("ws message parse error", err);
      }
    };
    ws.onerror = (e) => console.error("ws error", e);
    ws.onclose = () => console.log("ws closed");
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(JSON.stringify({ type: "ping" })); } catch {}
      }
    }, 20000);
    return () => {
      clearInterval(pingInterval);
      try { ws.close(); } catch {}
    };
  }, [onMessage]);
}
