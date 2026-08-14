// jest 解析桩：node_modules/http-proxy-agent@7.0.2 在本环境缺失编译产物 dist/index.js
// （仅有 .d.ts / .map，属环境依赖损坏，与业务代码无关；src 不引用该包）。
// 该桩仅用于让 jest 解析通过；运行时业务代码不依赖此包。
export default class HttpProxyAgent {
  constructor(_opts: unknown) {}
}
export class HttpsProxyAgent extends HttpProxyAgent {}
