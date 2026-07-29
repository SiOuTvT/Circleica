# Studio 实体 Phase 1 迁移 — 完整改动报告

> 日期：2026-07-29 17:50 · 范围：Circleica 后台 `Game` 制作组数据底座重构
> 状态：代码完成、迁移已应用本地 dev Postgres、tsc/eslint 通过

---

## 一、决策（用户定稿）

1. **采用 `Studio` + `GameStudio` 多对多**（composite PK `gameId+studioId`），不改方向。
2. 当前无生产数据 → **删除 `Game.studioName`**，不保留 deprecated 镜像字段。
3. Studio 只作为资源站的制作组**基础实体**，**不是百科系统**。
4. `aliases` 保持 JSON 字符串（Phase 1 不提前拆表）。
5. `role` 字段保留 `nullable`，为未来联合制作关系扩展预留。
6. `normalizedName` 继续作为当前 URL key，**暂不引入 slug**。

---

## 二、Schema 变更（`prisma/schema.prisma`）

### 删除
```prisma
// Game 模型（约 line 185 区域）移除：
studioName String @default("")
```

### 新增模型（位于 `TagGroup` 之前）
```prisma
model Studio {
  id             String   @id @default(cuid())
  normalizedName String   @unique
  displayName    String
  aliases        String   @default("[]")
  vndbId         String?
  producerType   String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  games          GameStudio[]
  @@index([normalizedName])
}

model GameStudio {
  gameId   String
  studioId String
  role     String?
  game     Game   @relation(fields: [gameId], references: [id], onDelete: Cascade)
  studio   Studio @relation(fields: [studioId], references: [id], onDelete: Cascade)
  @@id([gameId, studioId])
  @@index([studioId])
  @@index([gameId])
}
```

> **边界铁律**：`prisma/schema.prisma:805` 仍存在的 `studioName`（属 Galvelica `Work` 模型）**故意保留**，与 Circleica `Game.studioName` 是两套系统，绝不混淆。

---

## 三、迁移说明（`prisma/migrations/20260729095023_add_studio_entity/`）

已生成并**应用到本地 dev Postgres**。核心 SQL：

```sql
ALTER TABLE "Game" DROP COLUMN "studioName";
CREATE TABLE "Studio" (...);          -- 含 normalizedName UNIQUE
CREATE TABLE "GameStudio" (...);       -- gameId+studioId 复合主键
CREATE UNIQUE INDEX "Studio_normalizedName_key" ...;
CREATE INDEX "Studio_normalizedName_idx" ...;
CREATE INDEX "GameStudio_studioId_idx" ...;
CREATE INDEX "GameStudio_gameId_idx" ...;
ALTER TABLE "GameStudio" ADD CONSTRAINT ..._gameId_fkey  REFERENCES "Game"   ON DELETE CASCADE;
ALTER TABLE "GameStudio" ADD CONSTRAINT ..._studioId_fkey REFERENCES "Studio" ON DELETE CASCADE;
```

---

## 四、关键边界（实现铁律）

### 边界 1：Circleica `Game.studioName` vs Galvelica `Work.studioName`
- Circleica `Game.studioName` → **已删除**。
- Galvelica `Work.studioName`（schema 805）→ **保留**（不同子系统，本次不在范围）。
- 全局 grep `studioName` 残留**仅**出现在 Galvelica 子系统，属预期。

### 边界 2：VNDB 适配器 `normalize()` 被两条流共用
`vndbAdapter.normalize()` 同时服务「后台 Game 导入」与「Galvelica Work 摄入」。
- 保留 `studioName`（Galvelica `Work` 仍需自由文本字段）。
- **新增并行** `studios: string[]`（Circleica `Game` 的 Studio 关联用）。
- **不重新拼接字符串** —— 满足用户「VNDB 导入保持 `studios:string[]`，不要重新拼接字符串」。

---

## 五、改动文件清单（消费者全部迁移到 Studio 查询 / `studios:string[]`）

### 数据层
| 文件 | 改动 |
|---|---|
| `src/lib/makers.ts` | `getMakers`/`getMakerDetail` 改写为**直查 `Studio` 表聚合**（去掉内存全量拉游戏）；去重创作者数用 `$queryRaw` 聚合 distinct creatorId；`MakerSummary`/`MakerDetail` 契约不变 |
| `src/lib/galvelica.ts` | `getStudiosFromGame` 改为 `GameStudio` 聚合（其余 `studioName` 引用属 Galvelica `Work`，保留） |
| `src/services/admin.ts` | 新增 `linkGameStudios(tx, studios, gameId)`（镜像 `linkGameCreators`：upsert + deleteMany + createMany，幂等）；`create`/`update` 移除 `studioName`，接 `studios` |
| `src/repositories/admin.ts` | `findPaginated` 的 game select 加 `studios`（take:3, displayName） |

### 校验 / VNDB 链路
| 文件 | 改动 |
|---|---|
| `src/lib/validations.ts` | `studioName: z.string().max(200).optional()` → `studios: z.array(z.string().max(200)).max(20).optional()` |
| `src/lib/galvelica/sources/types.ts` | `NormalizedWork` 加 `studios?: string[]`（保留 `studioName?`） |
| `src/lib/galvelica/sources/vndb.ts` | normalize 返回新增 `studios = devs.map(d=>d.name)`（保留 `studioName` 拼接串） |
| `src/app/api/admin/vndb/route.ts` | `studioName: norm.studioName ?? ""` → `studios: norm.studios ?? []` |
| `src/app/api/admin/vndb/import/route.ts` | 同上 |

### 详情页 / 表单
| 文件 | 改动 |
|---|---|
| `src/components/game-form.tsx` | `studioName` 单值 → `studios: string[]`；输入改为逗号拆分多值（`value={studios.join(", ")}` → `onChange` split）；placeholder「如：Key, Type-Moon」；VNDB 填充 `setStudios(d.studios)` |
| `src/components/game-detail-client.tsx` | prop `studioName?: string` → `studios?: { name: string; normalized: string }[]` |
| `src/components/game-detail/game-info-list.tsx` | 渲染多个 `<a href="/credits/studio/${encodeURIComponent(s.normalized)}">` Pill |
| `src/app/games/[id]/page.tsx` | `fetchGame` include `studios`（带 displayName/normalizedName）；映射为 `studios` prop |

### 合集
| 文件 | 改动 |
|---|---|
| `src/app/api/curated-collections/[id]/route.ts` | 移除 `studioName: true`，改用 `studios` 扁平为 displayName 数组 |
| `src/app/api/admin/curated-collections/[id]/route.ts` | **一度漏改已补**：原残留 `studioName: true` 会运行时报错，已同步改 `studios` 扁平 |
| `src/app/admin/curated-collections/page.tsx` | `GameItem.studioName?` → `studios?: string[]`；渲染 `g.studios.join(", ")` |
| `src/app/api/credits/studios/route.ts` | 注释更新（不再引用 `studioName`） |

---

## 六、验证结果

| 检查项 | 结果 |
|---|---|
| `prisma generate` (v6.19.3) | ✅ 成功 |
| 迁移应用（本地 dev Postgres） | ✅ `20260729095023_add_studio_entity` 已生效 |
| `npx tsc --noEmit` 源码 | ✅ **0 error**（仅 `.next/dev/types/validator.ts` 生成文件 2 处噪声，非源码） |
| `npx eslint "src/**/*.{ts,tsx}"` | ✅ **0 error**（65 条预存 `any`/未用变量 warning，非本次引入） |
| `grep studioName` 全仓 | ✅ 残留**仅** Galvelica 子系统（`src/lib/galvelica/*`、`components/galvelica/*`、`sources/*`）+ `makers.ts:8` 一处解释注释；**无 Circleica `Game` 依赖残留** |

---

## 七、需用户确认 / 后续事项

### 协作边界（重要）
- agent **不动** git / 部署 / 服务器 / Docker-infra（用户铁律）。
- **用户侧步骤**：部署到 Coolify → 启动 → 浏览器回归：
  1. `/credits` 制作组网格、`/credits/studio/[name]` 详情页
  2. 游戏详情页制作组 Pill 链接
  3. 后台编辑/新建游戏 → 制作组多值输入 → 保存
  4. 后台 VNDB 导入 → 制作组是否正确落 `Studio`/`GameStudio`
  5. 精选合集列表/编辑中制作组显示

### 明确不在 Phase 1 范围（未来批次）
- Studio 管理 UI（增删改查 / 合并别名）
- VNDB producer 摄入填 `vndbId` / `producerType`（type co/in/ng ↔ 商业/个人/同人团体，精确同人分类，呼应 Galvelica 同人定义）
- 同人分类（`doujinCategory` 标签/字段）
- 删除 Galvelica `Work.studioName` 等价字段
- 引入 `slug`（路由 key 暂保留 `normalizedName`）

---

## 八、风险与回滚
- 本次为**纯新增 + 删除自由文本列**，无生产数据迁移风险（用户确认无生产数据）。
- 回滚：删除迁移 `20260729095023_add_studio_entity` 目录并 `prisma migrate resolve --rolled-back`，或 `prisma migrate dev --create-only` 反向迁移；业务代码需同步回退（Git revert）。
