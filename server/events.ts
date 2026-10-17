/// <reference types="node" />
import type { Request, Response } from 'express';

// Live updates: every open portal keeps one event stream and refetches its data when anything changes.
// ponytail: one process holds the connections; with several server instances, fan out through Postgres LISTEN/NOTIFY or Redis.
const clients = new Set<Response>();

export const eventStream = (req: Request, res: Response) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write('retry: 3000\n\n');
  clients.add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
  req.on('close', () => {
    clearInterval(ping);
    clients.delete(res);
  });
};

let pending: NodeJS.Timeout | undefined;
export const broadcastChange = () => {
  // Coalesce bursts (one action can touch several records) into one message.
  if (pending) return;
  pending = setTimeout(() => {
    pending = undefined;
    for (const res of clients) res.write(`event: change\ndata: ${Date.now()}\n\n`);
  }, 50);
};
