/**
 * 结构化日志工具
 *
 * - 开发环境：彩色人类可读输出
 * - 生产环境：JSON 结构化输出（便于日志收集）
 * - 禁止业务代码直接 console.log，统一通过 logger
 *
 * 使用方式：
 *   import { logger } from "@/lib/logger"
 *   logger.api.info("请求处理完成", { path: "/api/games", duration: 42 })
 *   logger.db.error("查询失败", error)
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogContext {
  [key: string]: string | number | boolean | null | undefined | Error
}

// ── 日志级别优先级 ───────────────────
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const MIN_LEVEL: LogLevel =
  process.env.NODE_ENV === "production" ? "info" : "debug"

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL]
}

// ── 颜色（仅开发环境）───────────────
const COLORS = {
  debug: "\x1b[36m",  // cyan
  info:  "\x1b[32m",  // green
  warn:  "\x1b[33m",  // yellow
  error: "\x1b[31m",  // red
  dim:   "\x1b[90m",  // gray
  reset: "\x1b[0m",
}

const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: "DBG",
  info:  "INF",
  warn:  "WRN",
  error: "ERR",
}

// ── Logger 类 ───────────────────────

class Logger {
  private scope: string

  constructor(scope: string) {
    this.scope = scope
  }

  debug(message: string, context?: LogContext) {
    this.emit("debug", message, context)
  }

  info(message: string, context?: LogContext) {
    this.emit("info", message, context)
  }

  warn(message: string, context?: LogContext) {
    this.emit("warn", message, context)
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errCtx: LogContext = { ...context }
    if (error instanceof Error) {
      errCtx.error = error.message
      errCtx.stack = error.stack
    } else if (error !== undefined) {
      errCtx.error = String(error)
    }
    this.emit("error", message, errCtx)
  }

  /**
   * 计时工具：返回一个函数，调用时记录耗时
   */
  timer(label: string): () => void {
    const start = performance.now()
    return () => {
      this.debug(`${label} 完成`, { duration_ms: Math.round(performance.now() - start) })
    }
  }

  // ── 内部 ──────────────────────────

  /**
   * 把 LogContext 中的 Error / 非 JSON 安全值规整为字符串，避免序列化报错。
   */
  private sanitize(ctx: LogContext): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(ctx)) {
      if (v instanceof Error) {
        out[k] = v.message
        out[`${k}_stack`] = v.stack
      } else if (v === null || v === undefined) {
        // 跳过空值，保持日志紧凑
      } else {
        out[k] = v
      }
    }
    return out
  }

  private emit(level: LogLevel, message: string, context?: LogContext) {
    if (!shouldLog(level)) return

    const timestamp = new Date().toISOString()

    // 关联增强：请求上下文（requestId/route）与当前 Trace（traceId/spanId）。
    // 仅在服务端 instrumentation 启动时注册这两个 getter；客户端恒为 undefined → 自动降级。
    const getReqCtx = (globalThis as Record<string, unknown>).__circleicaGetRequestCtx as
      | (() => { requestId?: string; route?: string } | undefined)
      | undefined
    const getTraceCtx = (globalThis as Record<string, unknown>).__circleicaTraceCtx as
      | (() => { traceId?: string; spanId?: string })
      | undefined
    const reqCtx = getReqCtx?.()
    const traceCtx = getTraceCtx?.()

    const enrich: Record<string, unknown> = {}
    if (reqCtx?.requestId) enrich.request_id = reqCtx.requestId
    if (reqCtx?.route) enrich.route = reqCtx.route
    if (traceCtx?.traceId) enrich.trace_id = traceCtx.traceId
    if (traceCtx?.spanId) enrich.span_id = traceCtx.spanId

    if (process.env.NODE_ENV === "production") {
      // 生产环境：JSON 结构化
      const entry: Record<string, unknown> = {
        level,
        time: timestamp,
        scope: this.scope,
        msg: message,
        ...enrich,
      }
      if (context && Object.keys(context).length > 0) {
        Object.assign(entry, this.sanitize(context))
      }
      // 生产环境用 stdout/stderr 分流
      const out = level === "error" ? process.stderr : process.stdout
      out.write(JSON.stringify(entry) + "\n")
    } else {
      // 开发环境：彩色格式化
      const c = COLORS
      const label = LEVEL_LABELS[level]
      const ctxObj = { ...enrich, ...(context ? this.sanitize(context) : {}) }
      const ctxStr = Object.keys(ctxObj).length > 0
        ? ` ${c.dim}${JSON.stringify(ctxObj)}${c.reset}`
        : ""
      const line = `${c.dim}${timestamp}${c.reset} ${c[level]}${label}${c.reset} ${c.dim}[${this.scope}]${c.reset} ${message}${ctxStr}`

      if (level === "error") {
        if (typeof process !== "undefined" && process.stderr) process.stderr.write(line + "\n")
        else console.error(line)
      } else {
        if (typeof process !== "undefined" && process.stdout) process.stdout.write(line + "\n")
        else console.log(line)
      }
    }

    // 结构化日志接入后端（Loki / OTel logs）。
    // 未配置监控服务时 __circleicaLogSink 不存在，此分支自动跳过 —— 实现「无监控降级」。
    const sink = (globalThis as Record<string, unknown>).__circleicaLogSink as
      | ((r: {
          severityText: string
          body: string
          attributes: Record<string, unknown>
        }) => void)
      | undefined
    if (sink) {
      try {
        sink({
          severityText: level,
          body: message,
          attributes: {
            scope: this.scope,
            level,
            ...enrich,
            ...(context ? this.sanitize(context) : {}),
          },
        })
      } catch {
        /* 监控失败绝不能影响业务日志 */
      }
    }
  }
}

// ── 导出常用实例 ────────────────────

export const logger = {
  auth: new Logger("Auth"),
  api: new Logger("API"),
  db: new Logger("DB"),
  upload: new Logger("Upload"),
  game: new Logger("Game"),
  user: new Logger("User"),
  forum: new Logger("Forum"),
  queue: new Logger("Queue"),
  cache: new Logger("Cache"),
  system: new Logger("System"),
}

export { Logger }
export type { LogContext }
