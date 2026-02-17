import type { Logger, LogLevel } from './Logger.js';

export class ConsoleLogger implements Logger {
  level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  private getTimestamp(): string {
    return new Date().toISOString().slice(11, 23);
  }

  private formatMeta(meta: unknown): string {
    if (meta === undefined) return '';
    if (this.level === 'debug') {
      return '\n' + JSON.stringify(meta, null, 2);
    }
    return ' ' + JSON.stringify(meta);
  }

  info(msg: string, meta?: unknown): void {
    if (this.level === 'silent') return;
    const metaStr = meta !== undefined ? this.formatMeta(meta) : '';
    console.log(`[Agility] ${this.getTimestamp()} ${msg}${metaStr}`);
  }

  debug(msg: string, meta?: unknown): void {
    if (this.level !== 'debug') return;
    const metaStr = meta !== undefined ? this.formatMeta(meta) : '';
    console.log(`[Agility] ${this.getTimestamp()} [DEBUG] ${msg}${metaStr}`);
  }

  error(msg: string, meta?: unknown): void {
    const metaStr = meta !== undefined ? this.formatMeta(meta) : '';
    console.error(`[Agility] ${this.getTimestamp()} [ERROR] ${msg}${metaStr}`);
  }
}
