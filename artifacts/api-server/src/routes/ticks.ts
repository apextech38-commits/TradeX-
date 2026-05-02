import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const DERIV_APP_ID = "339IyLjCcUmBEXEzG6tsS";
const DERIV_WS = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;
const CONNECT_TIMEOUT_MS = 10_000;

function openDerivWS(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(DERIV_WS);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("Deriv WS connection timed out"));
    }, CONNECT_TIMEOUT_MS);

    ws.addEventListener("open", () => {
      clearTimeout(timer);
      resolve(ws);
    });
    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("Deriv WS connection error"));
    });
  });
}

router.get("/ticks/stream/:symbol", (req: Request, res: Response) => {
  const symbol = req.params.symbol;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let ws: WebSocket | null = null;
  let closed = false;

  const cleanup = () => {
    closed = true;
    if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    if (!res.writableEnded) res.end();
  };

  req.on("close", cleanup);
  req.on("error", cleanup);

  openDerivWS()
    .then((socket) => {
      if (closed) { socket.close(); return; }
      ws = socket;

      ws.send(JSON.stringify({
        ticks_history: symbol,
        count: 1,
        end: "latest",
        start: 1,
        style: "ticks",
        subscribe: 1,
      }));

      ws.addEventListener("message", (evt) => {
        if (closed) return;
        try {
          const msg = JSON.parse(evt.data as string);
          if (msg.error) { cleanup(); return; }
          if (msg.msg_type === "tick") {
            const { quote, epoch } = msg.tick;
            res.write(`data: ${JSON.stringify({ value: quote, epoch })}\n\n`);
          }
        } catch (_) {}
      });

      ws.addEventListener("close", () => { if (!closed) cleanup(); });
      ws.addEventListener("error", () => { if (!closed) cleanup(); });
    })
    .catch(() => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: "failed" })}\n\n`);
        res.end();
      }
    });
});

router.get("/ticks/:symbol", async (req: Request, res: Response) => {
  const symbol = req.params.symbol;
  const count = Math.min(Math.max(parseInt(req.query["count"] as string) || 100, 1), 5000);

  let ws: WebSocket | null = null;
  try {
    ws = await openDerivWS();

    const data = await new Promise<{ prices: number[]; times: number[] }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("history response timed out")), 10_000);

      ws!.send(JSON.stringify({
        ticks_history: symbol,
        count,
        end: "latest",
        start: 1,
        style: "ticks",
      }));

      ws!.addEventListener("message", (evt) => {
        try {
          const msg = JSON.parse(evt.data as string);
          if (msg.error) { clearTimeout(timer); reject(new Error(msg.error.message)); return; }
          if (msg.msg_type === "history") {
            clearTimeout(timer);
            resolve({ prices: msg.history.prices as number[], times: msg.history.times as number[] });
          }
        } catch (e) { clearTimeout(timer); reject(e); }
      });

      ws!.addEventListener("error", () => { clearTimeout(timer); reject(new Error("WS error")); });
    });

    ws.close();
    res.json(data);
  } catch (err: unknown) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    const msg = err instanceof Error ? err.message : "unknown error";
    res.status(502).json({ error: msg });
  }
});

export default router;
