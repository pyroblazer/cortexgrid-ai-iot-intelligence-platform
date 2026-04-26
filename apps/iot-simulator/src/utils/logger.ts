import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, colorize } = format;

const logFormat = printf(({ level, message, timestamp: ts, ...metadata }) => {
  const metaStr = Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '';
  return `${ts} [${level}]: ${message}${metaStr}`;
});

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), logFormat),
  transports: [
    new transports.Console({
      format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), logFormat),
    }),
  ],
  exitOnError: false,
});
