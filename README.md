<div align="center">

# 🎮 Fangame

**专注同人 Galgame 的资源收录与分享平台**

收录、整理、发现优秀的同人视觉小说与 Galgame

</div>

---

## 📸 预览

<!-- 替换为实际截图 -->
| 首页 | 游戏详情 | 管理后台 |
|:---:|:---:|:---:|
| ![首页](screenshots/home.png) | ![详情](screenshots/detail.png) | ![后台](screenshots/admin.png) |

| 搜索 | 论坛 | 个人中心 |
|:---:|:---:|:---:|
| ![搜索](screenshots/search.png) | ![论坛](screenshots/forum.png) | ![个人](screenshots/profile.png) |

## ✨ 为什么选择 我们

- **专注同人 Galgame** — 只收录同人 Galgame / 视觉小说，不做大杂烩，内容精准垂直
- **VNDB 数据对接** — 一键从 VNDB 导入游戏信息、标签、封面，数据权威且省时
- **智能标签系统** — 多维度标签分组（题材、类型、角色、制作社等），支持按位置检索与高级筛选
- **资源聚合** — 统一管理游戏下载链接、汉化补丁、攻略等资源，告别散落各处
- **社区互动** — 评论、评分、收藏、关注、签到、论坛讨论，打造同好交流空间
- **创作者主页** — 独立的剧本家与画师页面，追踪你喜爱的创作者作品
- **个性化体验** — 暗色模式、主题定制、头像框系统、消息通知
- **移动端适配** — 完整的响应式设计，手机也能流畅浏览
- **VNDB 标签同步** — 自动同步 VNDB 标签体系，保持标签规范统一

## 🛠 技术栈

| 类别 | 技术 |
|---|---|
| **框架** | Next.js 16 (App Router) |
| **语言** | TypeScript |
| **UI** | Tailwind CSS 4 + Radix UI + shadcn/ui |
| **数据库** | PostgreSQL + Prisma ORM |
| **认证** | NextAuth v5 |
| **图片处理** | Sharp |
| **富文本编辑** | TipTap |
| **图表** | Recharts |
| **邮件** | Resend |
| **错误监控** | Sentry |
| **进程管理** | PM2 |
| **反向代理** | OpenResty (Nginx) |

## 🚀 快速开始

```bash
# 克隆项目
git clone https://github.com/SiOuTvT/fangame.git
cd fangame

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填写数据库连接等配置

# 初始化数据库
npx prisma migrate deploy
npx prisma generate

# 构建 & 启动
npm run build
npm start
```

> 📖 **生产环境部署**请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)，包含 PostgreSQL + PM2 的完整部署教程。

## 📁 项目结构

```
├── prisma/          # 数据库 Schema & 迁移文件
├── public/          # 静态资源（上传文件、音乐等）
├── scripts/         # 工具脚本（数据导出、检查等）
├── src/
│   ├── app/         # Next.js App Router 页面 & API
│   ├── components/  # React 组件
│   ├── hooks/       # 自定义 Hooks
│   ├── lib/         # 工具库（数据库、认证、缓存等）
│   └── types/       # TypeScript 类型定义
```

## 📋 功能概览

<details>
<summary><strong>🎯 游戏管理</strong></summary>

- 游戏收录（手动 / VNDB 一键导入）
- 游戏详情页（封面、简介、制作信息、资源链接）
- 多维标签筛选（题材、类型、制作社、角色等）
- 高级搜索 + 搜索建议
- 游戏合集 / 收藏夹
- 相关游戏推荐
- 访问量统计

</details>

<details>
<summary><strong>👥 用户系统</strong></summary>

- 注册 / 登录（密码 + 邮箱）
- 个人主页 & 个人资料编辑
- 头像上传 + 头像框系统
- 收藏、关注、签到
- 消息通知中心
- 浏览历史

</details>

<details>
<summary><strong>💬 社区功能</strong></summary>

- 游戏评论与评分
- 论坛板块（发帖、回帖、点赞）
- 用户关注
- 举报系统
- 每日心情语录

</details>

<details>
<summary><strong>⚙️ 管理后台</strong></summary>

- 游戏 CRUD + 批量操作
- 标签 & 标签组管理
- 创作者管理（剧本家 / 画师）
- 用户管理
- 公告管理（轮播图）
- 论坛管理
- 站点设置（主题色、全局配置）
- 情感语录管理
- 头像框管理
- 数据统计面板

</details>

## 📄 License

[MIT](./LICENSE) © Fangame