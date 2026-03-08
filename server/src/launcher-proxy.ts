import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import type { Server as HttpServer } from "node:http";
import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "hiveclip-dev-secret";
const LAUNCHER_PORT = 3001;

/**
 * HTTP reverse proxy: /api/launcher/:ip/* -> http://<ip>:3001/*
 */
export function createLauncherRouter(): Router {
  const router = createRouter();

  function proxyHandler(req: Request, res: Response) {
    const vmIp = req.params.ip as string;
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(vmIp)) {
      res.status(400).json({ error: "Invalid IP" });
      return;
    }

    // Verify JWT from Authorization header or query param (iframe can't set headers)
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token as string | undefined;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : queryToken || null;
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      jwt.verify(token, JWT_SECRET);
    } catch {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    // Build target URL
    const subPath = (req.params as Record<string, string>).path || "";
    const url = new URL(req.url!, `http://${req.headers.host}`);
    url.searchParams.delete("token");
    const qs = url.searchParams.toString();
    const fullUrl = `http://${vmIp}:${LAUNCHER_PORT}/${subPath}${qs ? "?" + qs : ""}`;

    const proxyReq = http.request(
      fullUrl,
      {
        method: req.method,
        headers: { ...req.headers, host: `${vmIp}:${LAUNCHER_PORT}` },
        timeout: 30_000,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );

    proxyReq.on("error", (err) => {
      console.error(`[Launcher Proxy] HTTP error for ${vmIp}:`, err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: `Launcher unreachable: ${err.message}` });
      }
    });

    req.pipe(proxyReq);
  }

  // Handle both root and subpaths
  router.all("/:ip", proxyHandler);
  router.all("/:ip/:path(.*)", proxyHandler);

  return router;
}

/**
 * WebSocket proxy for the launcher's terminal:
 * ws://host/api/launcher-ws/:ip?token=...  ->  ws://<ip>:3001
 */
export function setupLauncherWsProxy(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  const existingListeners = server.listeners("upgrade").slice();
  server.removeAllListeners("upgrade");

  server.on("upgrade", (req, socket, head) => {
    const match = req.url?.match(/^\/api\/launcher-ws\/(\d+\.\d+\.\d+\.\d+)/);
    if (!match) {
      for (const listener of existingListeners) {
        (listener as Function).call(server, req, socket, head);
      }
      return;
    }

    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    try {
      jwt.verify(token, JWT_SECRET);
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const vmIp = match[1];

    wss.handleUpgrade(req, socket, head, (clientWs) => {
      const vmWsUrl = `ws://${vmIp}:${LAUNCHER_PORT}${req.url?.replace(/^\/api\/launcher-ws\/\d+\.\d+\.\d+\.\d+/, "") || ""}`;
      const vmWs = new WebSocket(vmWsUrl);

      vmWs.on("open", () => {
        console.log(`[Launcher WS] Connected to ${vmIp}:${LAUNCHER_PORT}`);
      });

      vmWs.on("message", (data) => {
        if (clientWs.readyState === WebSocket.OPEN) clientWs.send(data);
      });

      clientWs.on("message", (data) => {
        if (vmWs.readyState === WebSocket.OPEN) vmWs.send(data);
      });

      vmWs.on("error", (err) => {
        console.error(`[Launcher WS] VM error:`, err.message);
        clientWs.close(1011, "Launcher connection error");
      });

      vmWs.on("close", () => clientWs.close());
      clientWs.on("close", () => vmWs.close());
      clientWs.on("error", () => vmWs.close());
    });
  });

  return wss;
}
