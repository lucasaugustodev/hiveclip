import "dotenv/config";
import pino from "pino";
import { createApp } from "./app.js";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true },
  },
});

const PORT = Number(process.env.PORT) || 3100;

const app = createApp(logger);

const server = app.listen(PORT, () => {
  logger.info(`HiveClip Control Plane listening on port ${PORT}`);
});

function shutdown() {
  logger.info("Shutting down gracefully...");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
