/**
 * 队列适配器接口
 *
 * 当前实现：内存同步队列（直接执行）
 * 预留接口：Redis Queue / BullMQ / SQS
 *
 * 使用方式：
 *   import { getQueue } from "@/lib/queue"
 *   const queue = getQueue()
 *   await queue.enqueue("send-email", { to: "user@example.com", subject: "..." })
 *
 * 队列类型：
 *   - send-email: 发送邮件
 *   - send-notification: 发送通知
 *   - compress-image: 图片压缩
 *   - cleanup: 定期清理任务
 */

import { logger } from "./logger"

// ── 类型定义 ────────────────────────

export type JobType =
  | "send-email"
  | "send-notification"
  | "compress-image"
  | "cleanup"

export interface Job<T = unknown> {
  id: string
  type: JobType
  payload: T
  createdAt: Date
  attempts: number
  maxAttempts: number
  status: "pending" | "processing" | "completed" | "failed"
}

export interface QueueAdapter {
  /** 投递任务 */
  enqueue<T>(type: JobType, payload: T, opts?: { maxAttempts?: number; delay?: number }): Promise<Job<T>>
  /** 获取队列状态 */
  stats(): Promise<{ pending: number; processing: number; completed: number; failed: number }>
}

// ── 内存同步实现（开发/单实例）──────

class MemoryQueueAdapter implements QueueAdapter {
  name = "memory"

  async enqueue<T>(type: JobType, payload: T, opts?: { maxAttempts?: number }): Promise<Job<T>> {
    const job: Job<T> = {
      id: crypto.randomUUID(),
      type,
      payload,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: opts?.maxAttempts ?? 3,
      status: "pending",
    }

    // 内存队列直接执行（同步）
    logger.queue.info(`任务入队: ${type}`, { jobId: job.id })
    this.processJob(job).catch(() => {})
    return job
  }

  async stats() {
    return { pending: 0, processing: 0, completed: 0, failed: 0 }
  }

  private async processJob(job: Job): Promise<void> {
    job.status = "processing"
    job.attempts++

    try {
      // 根据类型分发到对应 handler
      // 目前为空壳，后续实现具体逻辑
      logger.queue.info(`任务处理: ${job.type}`, { jobId: job.id })
      job.status = "completed"
    } catch (e) {
      if (job.attempts < job.maxAttempts) {
        logger.queue.warn(`任务重试: ${job.type} (${job.attempts}/${job.maxAttempts})`, { jobId: job.id })
        job.status = "pending"
        // 指数退避
        setTimeout(() => this.processJob(job), 1000 * Math.pow(2, job.attempts))
      } else {
        logger.queue.error(`任务失败: ${job.type}`, e, { jobId: job.id })
        job.status = "failed"
      }
    }
  }
}

// ── 工厂 ────────────────────────────

let _queue: QueueAdapter | null = null

/**
 * 获取队列适配器（单例）
 *
 * 未来扩展：
 * - 有 Redis → BullMQ
 * - 有 SQS → AWS SQS
 * - 默认 → 内存同步
 */
export function getQueue(): QueueAdapter {
  if (_queue) return _queue
  _queue = new MemoryQueueAdapter()
  logger.queue.info("队列后端: 内存同步模式")
  return _queue
}
