import "@testing-library/jest-dom"

// jsdom 环境未提供 Web Request/Response/Headers/FormData 全局，
// next/server 在模块加载期即引用它们，导致 CSRF 等依赖 next/server 的单测无法启动。
// 用 undici 按需补全（不影响 jsdom 其它行为）。
import { request, response, headers, formData } from "undici"
if (typeof (globalThis as Record<string, unknown>).Request === "undefined") {
  ;(globalThis as Record<string, unknown>).Request = request
}
if (typeof (globalThis as Record<string, unknown>).Response === "undefined") {
  ;(globalThis as Record<string, unknown>).Response = response
}
if (typeof (globalThis as Record<string, unknown>).Headers === "undefined") {
  ;(globalThis as Record<string, unknown>).Headers = headers
}
if (typeof (globalThis as Record<string, unknown>).FormData === "undefined") {
  ;(globalThis as Record<string, unknown>).FormData = formData
}
