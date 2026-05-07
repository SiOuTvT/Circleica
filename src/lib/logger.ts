/**
 * 简单的日志工具，支持不同级别和上下文
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class Logger {
  private prefix: string

  constructor(prefix: string) {
    this.prefix = prefix
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const ctxStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] [${this.prefix}] ${message}${ctxStr}`
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, context))
    }
  }

  info(message: string, context?: LogContext) {
    console.info(this.formatMessage('info', message, context))
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('warn', message, context))
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error(this.formatMessage('error', `${message}: ${errorMsg}`, context))
    if (errorStack) {
      console.error(errorStack)
    }
  }
}

// 导出常用日志器实例
export const logger = {
  auth: new Logger('Auth'),
  api: new Logger('API'),
  db: new Logger('Database'),
  upload: new Logger('Upload'),
  game: new Logger('Game'),
  user: new Logger('User'),
  forum: new Logger('Forum'),
}

// 默认日志器
export default Logger
