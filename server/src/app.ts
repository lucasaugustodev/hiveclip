import express from "express";
import pinoHttp from "pino-http";
import type { Logger } from "pino";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { boardsRouter } from "./routes/boards.js";
import { vmsRouter } from "./routes/vms.js";
import { errorHandler } from "./middleware/error-handler.js";

export function createApp(logger: Logger) {
  const app = express();

  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/api/health" } }));
  app.use(express.json());

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/boards", boardsRouter);
  app.use("/api", vmsRouter);

  app.use(errorHandler);

  return app;
}
