# 安全策略

Circleica 把安全当作基础要求，而不是上线后的补丁。

## 已落地的防护

- **认证与会话**：基于凭据的登录，JWT 会话，Cookie 设 `httpOnly` + `sameSite=lax`，`secure` 跟随部署协议；角色与邮箱验证状态每次会话从数据库读取，避免权限被旧令牌长期固化。
- **CSRF**：所有状态变更的 `/api/*`（登录类接口除外）与 `/api/admin` 写接口强制同源校验（校验 `Origin`，缺失时回退 `Referer`，两者皆无则拒绝）。带 Bearer 的接口调用豁免——API 客户端本身不是 CSRF 攻击面。
- **输入校验**：所有接口入参用 Zod 校验，超限请求返回字段级 422；分页 `limit` 有上限钳制。
- **限流**：按路由维度限流（登录、注册、评论、上传、搜索等），Redis 原子计数，Redis 不可用时降级为内存，不裸奔也不雪崩。
- **权限**：管理后台页面与接口均需对应角色；超级管理员路由按路径段精确匹配，避免 `/admin/users-export` 这类绕过。
- **文件上传**：类型白名单 + 大小上限 + 文件头魔数校验 + 图片完整性检查 + 限流；存储键随机生成，无路径穿越。
- **SSRF**：图片代理走域名白名单 + 禁止重定向跟随 + DNS 重绑定防护；外链下载地址强制为 http(s)，禁 `javascript:` / `data:` / `file:`。
- **响应头**：`X-Content-Type-Options`、`Referrer-Policy`、`X-Frame-Options: DENY`、`frame-ancestors none`、`Permissions-Policy`、`COOP` / `CORP` 等同源隔离头；重定向响应也带全套头。
- **错误处理**：对外报错统一为通用提示，不回吐 SQL、堆栈或内部字段；详细信息只进 Sentry（带 trace id）。
- **依赖**：`npm audit` 当前 0 漏洞。

## 已知偏差（产品决策，未擅自改动）

- **R2 资源访问（C-1）**：当前资源桶为公开读，代码未实现私有签名 URL。是否改为私有 + 签名下发是产品级决策，确定后补充签名 URL 与资源服务改造。
- **CSP（C-4）**：生产环境 `script-src` 当前含 `'unsafe-inline'`。Next 16 的 nonce 自动注入与页面内脚本 nonce 无法对齐（严格模式下生产白屏），故暂以 `unsafe-inline` 兜底。结合 React 默认转义、富文本净化、JSON-LD 转义，实际 XSS 风险低；是否切回 nonce 待产品决策。

## 报告漏洞

请通过私信或项目维护者指定的渠道报送安全问题，不要公开提 ISSUE。我们会尽快确认、定位并修复，修复后随版本发布说明。

## 部署相关

最终部署验收（R2 权限、TLS/HTTPS、Sentry、OTel、Redis 降级）在部署服务器执行，详见 `docs/launch-audit/DEPLOY_ACCEPTANCE_CHECKLIST.md`。
