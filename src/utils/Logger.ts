export type LogLevel = 'silent' | 'info' | 'debug';

export interface Logger {
  level: LogLevel;
  info(msg: string, meta?: unknown): void;
  debug(msg: string, meta?: unknown): void;
  error(msg: string, meta?: unknown): void;
}

export class ConsoleLogger implements Logger {
  level: LogLevel;
  private prefix: string;

  constructor(level: LogLevel = 'info', prefix: string = '[Agility]') {
    this.level = level;
    this.prefix = prefix;
  }

  private formatMeta(meta?: unknown): string {
    if (!meta) return '';
    return '\n' + JSON.stringify(meta, null, 2);
  }

  info(msg: string, meta?: unknown): void {
    if (this.level === 'silent') return;
    console.log(`${this.prefix} ${msg}${this.formatMeta(meta)}`);
  }

  debug(msg: string, meta?: unknown): void {
    if (this.level !== 'debug') return;
    console.log(`${this.prefix} [DEBUG] ${msg}${this.formatMeta(meta)}`);
  }

  error(msg: string, meta?: unknown): void {
    if (this.level === 'silent') return;
    console.error(`${this.prefix} [ERROR] ${msg}${this.formatMeta(meta)}`);
  }
}
