/**
 * @module logger
 * @description Logger structuré avec niveaux colorés.
 *   🟡 AUTH — 🔵 READ — 🟢 WRITE — 🔴 ERROR
 *
 * @author Spynel KOUTON
 */

type LogLevel = 'AUTH' | 'READ' | 'WRITE' | 'ERROR' | 'INFO';

const prefixes: Record<LogLevel, string> = {
  AUTH: '🟡 [AUTH]',
  READ: '🔵 [READ]',
  WRITE: '🟢 [WRITE]',
  ERROR: '🔴 [ERROR]',
  INFO: 'ℹ️  [INFO]',
};

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const base = `${timestamp} ${prefixes[level]} ${message}`;
  return meta ? `${base} ${JSON.stringify(meta)}` : base;
}

export const logger = {
  auth: (message: string, meta?: unknown) => console.log(formatMessage('AUTH', message, meta)),
  read: (message: string, meta?: unknown) => console.log(formatMessage('READ', message, meta)),
  write: (message: string, meta?: unknown) => console.log(formatMessage('WRITE', message, meta)),
  error: (message: string, meta?: unknown) => console.error(formatMessage('ERROR', message, meta)),
  info: (message: string, meta?: unknown) => console.log(formatMessage('INFO', message, meta)),
};
