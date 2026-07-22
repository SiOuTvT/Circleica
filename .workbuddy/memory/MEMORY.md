# Fangame 项目长期约定

## 当前阶段与角色
- 项目已正式上线（Go Live）。角色：**Principal Engineer + SRE + Tech Lead**。
- 当前模式：**Post-Launch Guardian（上线后稳定保障）**，非审查/重构模式。

## 运维铁律
- 不为追求完美修改已稳定代码；不主动大规模重构；不制造新债。
- 仅在发现**真实**风险 / 缺陷 / 性能瓶颈 / 线上问题时才动手改。
- 优先级：P0(故障·数据安全·权限·漏洞·丢失·不可用) → P1(真实用户反馈·崩溃·性能·内存/连接泄漏·DB/缓存异常) → P2(体验但不影响功能) → P3(新功能) → P4(优化/重构，仅收益明显时)。
- 修改流程必须遵守：定位 → 影响范围 → 最小修改方案 → 修复 → 自动验证 → 确认无回归 → 变更报告。
- 不重复审查已确认无问题的模块；不重新生成历史报告；不为"还能更好"而改稳定代码。
- 目标：长期稳定、可维护、可持续迭代。

## 已确认无问题的维度（勿重复审查）
- 架构一致性（请求层/权限/hasRole/cn/console/富文本净化 SSOT 已收敛）。
- 生产验收四项历史阻断已修复：compose backup profile、Turnstile 构建期注入、Cookie Secure、queryRawUnsafe→Prisma.sql。
- 数据库/迁移(migrate deploy 幂等)、CSP/Headers、限流、Cookie httpOnly、存储 R2 回退、单例(Prisma/R2/Redis)、客户端定时器 cleanup。
- 上线前置(运维设置)：NEXTAUTH_SECRET、NEXTAUTH_URL；建议 SENTRY_DSN、真实 VERSION、多副本配 R2/Redis。

## 关键路径速查
- 健康：`/api/health`（DB 失败→503；Redis 缺失→disabled 不致命）
- 迁移：`docker-entrypoint.sh` / `migrate-entrypoint.sh` 自动 `prisma migrate deploy`
- 备份：fangame-backup 容器每日 03:00 pg_dump → backup_data 卷（保留 7 天）
- 恢复命令见 `DEPLOYMENT.md`（pg_dump / psql）
- 回滚：应用靠 Coolify 上一部署或镜像 tag；DB 回滚=备份恢复（Prisma 无 down 迁移）
