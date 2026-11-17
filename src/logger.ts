import pino from "pino";
import { env } from "./env.js";

/**
 * Structured logging for the whole project. In addition to console output,
 * everything is appended to logs/bot.log so issues can be diagnosed after
 * the fact (e.g. "why did the bot remove a role at 3am").
 */
export const logger = pino(
  {
    level: env.LOG_LEVEL,
    base: { pid: false },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.transport({
    targets: [
      {
        target: "pino-pretty",
        level: env.LOG_LEVEL,
        options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
      },
      {
        target: "pino/file",
        level: env.LOG_LEVEL,
        options: { destination: "./logs/bot.log", mkdir: true },
      },
    ],
  })
);
