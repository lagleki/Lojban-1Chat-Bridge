import path from "path"
import * as winston from "winston"
import DailyRotateFile from "winston-daily-rotate-file"
import { cache_folder } from "./paths"

export const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(cache_folder, "info-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: false,
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
})

export const log = (messenger: string) => (message: unknown) =>
  logger.log({ level: "info", message: JSON.stringify({ message, messenger }) })
