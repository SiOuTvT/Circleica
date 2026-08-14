import * as Sentry from "@sentry/nextjs"

/**
 * 客户端错误边界上报（B-22）。
 * 集中到此处，便于统一控制上报行为；@sentry/nextjs 在未 init 时为 no-op，安全。
 */
export function captureClientError(error: unknown) {
  Sentry.captureException(error)
}
