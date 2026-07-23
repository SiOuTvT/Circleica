# 生产环境数据库重命名迁移 Runbook（fangame → circleica）

> 适用场景：项目已全量改名为 Circleica，需在**已存有数据的生产 Postgres** 上把库名/用户名也从 `fangame` 改为 `circleica`。
> 关键坑：Docker 版 Postgres 的 `POSTGRES_USER` / `POSTGRES_DB` **只在数据目录首次初始化时生效**。
> 已初始化的数据卷里，库名/用户名是写死的；直接改 `docker-compose.yml` 部署后，应用会用新凭据 `circleica:circleica@db:5432/circleica` 去连一个**不存在**的库/用户 → 启动崩溃。
> 因此必须用 `ALTER` 在现有集群内改名，**切勿靠改 compose 自动生效**，也**不要删除数据卷**（删卷=丢全部数据）。

---

## 方案 A：已有数据卷（迁移，保数据）

### 1. 先部署新命名的基础设施（但不要急着重启 app）
```bash
cd /opt/circleica
docker compose up -d db          # 仅起 db；此时 healthcheck 会因 circleica 库不存在而不健康——这是正常的
```
> 说明：新 compose 里 `container_name: circleica-db`、`POSTGRES_USER/DB: circleica`、`DATABASE_URL` 默认已指向 `circleica`。
> 但旧数据卷（`pg_data`）里的集群仍是 `fangame` 用户 + `fangame` 库，所以 db 容器起来后实际内部还是 `fangame`。

### 2. 终止占用旧库的其它会话（如旧 app / 连接池）
```bash
docker exec circleica-db psql -U <原超级用户> -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='fangame' AND pid <> pg_backend_pid();"
```
- Docker 部署下，超级用户通常是 `postgres`，其密码 = 最初 `POSTGRES_PASSWORD`（例如最早是 `fangame`）。
- 若不确定超管口令，进容器用 peer/trust：`docker exec -it circleica-db psql -U postgres -d postgres`。

### 3. 在现有集群内改名（以超级用户连接 `postgres` 系统库，而非业务库）
```bash
docker exec -i circleica-db psql -U <原超级用户> -d postgres <<'SQL'
ALTER DATABASE fangame RENAME TO circleica;
ALTER USER fangame RENAME TO circleica;
-- 如需把密码同步成新约定（compose 里 POSTGRES_PASSWORD 现在是 circleica），执行：
ALTER USER circleica WITH PASSWORD 'circleica';
SQL
```
> ⚠️ 若 `ALTER USER fangame RENAME TO circleica;` 报 `无法重命名会话用户`，说明你正以 `fangame` 自身连接。
> 解决：改用 `postgres` 超管连接；或先建临时超管再改名：
> ```sql
> CREATE ROLE tmp_mig SUPERUSER LOGIN PASSWORD 'tmppass';
> -- 新开一个 psql 会话以 tmp_mig 连接，再执行上面的 ALTER USER / ALTER DATABASE
> DROP ROLE tmp_mig;
> ```

### 4. 验证 + 拉起应用
```bash
docker exec circleica-db psql -U circleica -d circleica -c "SELECT 1"   # 应成功
docker compose up -d                 # healthcheck 通过，migrate + app 启动
docker compose restart app           # 保险起见重启 app，使其用新连接串
```

### 5. 确认生产环境变量
- 若生产 `DATABASE_URL` 通过 env/Coolify 注入，确保值为 `postgresql://circleica:<密码>@db:5432/circleica`。
- 若依赖 compose 默认值（`postgresql://circleica:circleica@db:5432/circleica`），无需额外操作。

---

## 方案 B：全新部署（数据卷为空）
直接 `docker compose up -d` 即可。`POSTGRES_USER/DB=circleica` 在首次初始化时生效，无需任何迁移。

---

## 改名带来的预期影响（均属正常，非 bug）
- **所有已登录用户被登出**：cookie 名已从 `fangame-session-token` 改为 `circleica-session-token`，旧会话 cookie 失效，用户需重新登录。
- **Redis 缓存冷启动**：key 前缀已从 `fangame:` 改为 `circleica:`，旧缓存键失效，首次访问会回源重建（几分钟内自然恢复）。
- **备份容器**：`docker-compose.yml` 里备份 cron 已改为 `pg_dump ... circleica` 并生成 `circleica-*.sql.gz`，无需额外改动。

## 回滚
若迁移后出现问题且需回退：
```sql
ALTER DATABASE circleica RENAME TO fangame;
ALTER USER circleica RENAME TO fangame;
```
然后回退 `docker-compose.yml` / 应用代码到改名前版本重部署。

## 本地开发备注
- 本仓库的 `.env` 已指向 `circleica` 库；本地若用原生 Postgres 且无法以超管改名，可保留本地 `fangame` 用户、仅库名 `circleica`（连接串 `postgresql://fangame:<密码>@127.0.0.1:5432/circleica`）。
- 本地库名已通过 `ALTER DATABASE fangame RENAME TO circleica` 改好；本地用户名因沙箱无超管权限未改名，不影响本地开发。
