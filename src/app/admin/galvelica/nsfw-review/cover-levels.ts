/**
 * 封面露骨度分级文案（0=安全 1=暗示 2=露骨，-1=未知留待审核）。
 *
 * 单独成文件的原因：actions.ts 是 "use server" 模块，只允许导出 async 函数，
 * 在这里导出对象会让整个 action 模块在加载期就抛错、所有 action 变 500。
 */

export const COVER_SEXUAL_LABELS: Record<number, string> = {
  0: "安全",
  1: "暗示",
  2: "露骨",
}
