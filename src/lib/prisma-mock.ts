/**
 * 数据库不可用时的示例数据回退层。
 *
 * 仅当沙箱/离线环境无法连接 Postgres 时，由 prisma.ts 的代理自动启用；
 * 真实环境（能连上库）永不触发，不影响任何生产数据。
 *
 * 用途：让 UI 在「连不上库」时也能渲染出真实可看的页面（卡片、详情、画廊、公告），
 * 用于设计预览，而不是「数据加载失败」整页错误。
 */

function svg(title: string, hue: number, w = 400, h = 300): string {
  const safe = String(title).replace(/[<>&"]/g, "")
  const s =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='hsl(${hue},55%,46%)'/>` +
    `<stop offset='1' stop-color='hsl(${(hue + 35) % 360},52%,27%)'/>` +
    `</linearGradient></defs>` +
    `<rect width='100%' height='100%' fill='url(#g)'/>` +
    `<text x='50%' y='50%' fill='rgba(255,255,255,0.92)' font-family='sans-serif' font-size='${Math.round(
      w / 15,
    )}' font-weight='700' text-anchor='middle' dominant-baseline='middle'>${safe}</text>` +
    `</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`
}

const TAG_COLORS = [
  "#ec4899", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7",
  "#ef4444", "#14b8a6", "#eab308", "#8b5cf6", "#06b6d4",
]

const MOCK_USER = {
  id: "mock_user_1",
  username: "Circleica官方",
  avatar: svg("官方", 200, 120, 120),
}

const MOCK_TAG_GROUP = {
  id: "preset_home_card",
  name: "首页卡片",
  color: "#6b7280",
  positions: ["home_card"] as string[],
}

const MOCK_ANNOUNCEMENTS = [
  {
    id: "ann_1",
    title: "欢迎来到 Circleica 资源大厅",
    summary: "完全免费、开放注册的视觉小说同人档案库。",
    content: "我们收录同人游戏、Galgame 与视觉小说资源，支持标签筛选、收藏与社区讨论。",
    imageUrl: svg("公告", 210, 600, 240),
    link: "/about",
    createdAt: new Date(),
    authorName: "Circleica官方",
    authorAvatar: MOCK_USER.avatar,
    isPinned: true,
  },
  {
    id: "ann_2",
    title: "本周新增 12 部作品",
    summary: "编辑器精选了一批高质量新作，欢迎浏览。",
    content: "本周编辑团队精选了多部恋爱、治愈与剧情向作品。",
    imageUrl: svg("新作", 280, 600, 240),
    link: "/games",
    createdAt: new Date(Date.now() - 86400000),
    authorName: "编辑部",
    authorAvatar: MOCK_USER.avatar,
    isPinned: false,
  },
  {
    id: "ann_3",
    title: "社区公约更新",
    summary: "请文明交流，禁止搬运未授权商业作品。",
    content: "为保障创作者权益，社区禁止发布未授权商业游戏本体。",
    imageUrl: svg("公约", 160, 600, 240),
    link: "/rules",
    createdAt: new Date(Date.now() - 2 * 86400000),
    authorName: "管理组",
    authorAvatar: MOCK_USER.avatar,
    isPinned: false,
  },
]

const MOCK_COMMENTS = [
  {
    id: "cmt_1",
    content: "画风太顶了，剧情也很有代入感，强烈推荐！",
    user: { id: "u_a", username: "夜行猫", avatar: svg("夜", 320, 80, 80) },
  },
  {
    id: "cmt_2",
    content: "音乐部分非常惊艳，单曲循环了好久。",
    user: { id: "u_b", username: "旋律控", avatar: svg("旋", 30, 80, 80) },
  },
  {
    id: "cmt_3",
    content: "流程偏短，但ending很圆满，值得一玩。",
    user: { id: "u_c", username: "短通玩家", avatar: svg("短", 120, 80, 80) },
  },
]

const SEED = [
  { title: "星屑挽歌", originalWork: "原创剧本", tags: ["恋爱", "悲剧", "剧情向"], creators: ["夜樱诗乃", "雾岛凛"], hue: 280, nsfw: false, status: "FINISHED" },
  { title: "晴空列车", originalWork: "同人企划", tags: ["治愈", "日常", "音乐"], creators: ["白川澪", "青叶遥"], hue: 200, nsfw: false, status: "FINISHED" },
  { title: "猫与魔法书店", originalWork: "改编", tags: ["幻想", "喜剧", "和风"], creators: ["橘花音", "佐仓结衣"], hue: 30, nsfw: false, status: "ONGOING" },
  { title: "深海回声", originalWork: "原创", tags: ["悬疑", "科幻", "剧情向"], creators: ["黑岛彻", "蓝原雪"], hue: 220, nsfw: false, status: "FINISHED" },
  { title: "樱色季节", originalWork: "同人", tags: ["恋爱", "百合", "治愈"], creators: ["绫濑心", "小野寺葵"], hue: 340, nsfw: false, status: "FINISHED" },
  { title: "机械之心", originalWork: "原创", tags: ["科幻", "悲剧", "悬疑"], creators: ["雷顿博士", "艾拉"], hue: 260, nsfw: false, status: "ONGOING" },
  { title: "夏日烟火大会", originalWork: "同人", tags: ["日常", "喜剧", "恋爱"], creators: ["海老名凛", "宫园薰"], hue: 20, nsfw: false, status: "FINISHED" },
  { title: "幽夜茶会", originalWork: "原创", tags: ["幻想", "治愈", "和风"], creators: ["千歳雪", "夜久"], hue: 300, nsfw: false, status: "FINISHED" },
  { title: "末日信使", originalWork: "改编", tags: ["科幻", "悬疑", "剧情向"], creators: ["诺亚", "薇拉"], hue: 180, nsfw: false, status: "ONGOING" },
  { title: "甜味恋爱配方", originalWork: "同人", tags: ["恋爱", "喜剧", "日常"], creators: ["可可", "莓", "糖"], hue: 350, nsfw: false, status: "FINISHED" },
  { title: "苍穹之诗", originalWork: "原创", tags: ["剧情向", "幻想", "悲剧"], creators: ["天野遥", "星川"], hue: 240, nsfw: false, status: "FINISHED" },
  { title: "微光森林", originalWork: "同人", tags: ["治愈", "日常", "音乐"], creators: ["森灵", "小叶"], hue: 140, nsfw: false, status: "ONGOING" },
]

function buildGame(seed: (typeof SEED)[number], idx: number): any {
  const id = `mock_${idx + 1}`
  const serialId = idx + 1
  const now = Date.now() - idx * 36 * 3600 * 1000
  const createdAt = new Date(now)
  const updatedAt = new Date(now - 3600 * 1000)
  const tags = seed.tags.map((t, i) => ({
    tag: {
      id: `mock_tag_${idx}_${i}`,
      name: t,
      color: TAG_COLORS[(idx + i) % TAG_COLORS.length],
      group: { color: "#6b7280", name: "default" },
    },
  }))
  const creators = seed.creators.map((c, i) => ({
    role: i === 0 ? "原画" : i === 1 ? "剧本" : "音乐",
    creator: { id: `mock_creator_${idx}_${i}`, name: c, nameJa: "", avatar: svg(c, seed.hue, 120, 120) },
  }))
  const resourceTags = ["简体中文", "PC", "完整版"]
  return {
    id,
    serialId,
    title: seed.title,
    originalWork: seed.originalWork,
    coverImage: svg(seed.title, seed.hue),
    screenshots: [
      svg(`${seed.title} · 场景`, seed.hue, 1280, 720),
      svg(`${seed.title} · 立绘`, (seed.hue + 30) % 360, 1280, 720),
      svg(`${seed.title} · CG`, (seed.hue + 60) % 360, 1280, 720),
    ],
    description: `《${seed.title}》是${seed.originalWork}作品，标签：${seed.tags.join(
      " / ",
    )}。本作以细腻的演出与扎实的剧本获得编辑部推荐，欢迎下载体验。`,
    status: seed.status,
    isNsfw: seed.nsfw,
    favoriteCount: 120 - idx * 7,
    viewCount: 5400 - idx * 230,
    downloadCount: 980 - idx * 41,
    downloadLinks: [
      { label: "百度网盘", url: "#" },
      { label: "磁力链接", url: "#" },
    ],
    createdAt,
    updatedAt,
    publisher: MOCK_USER,
    tags,
    creators,
    resources: [
      {
        language: ["简体中文"],
        runType: ["PC"],
        resourceContent: ["完整版"],
        entries: [],
        user: { id: "u_upload", username: "热心上传者" },
      },
    ],
    comments: MOCK_COMMENTS.slice(0, 2 + (idx % 2)),
  }
}

export const MOCK_GAMES: any[] = SEED.map((s, i) => buildGame(s, i))

/**
 * 根据模型名 / 方法名 / 参数，返回示例数据。
 * shape 尽量贴合各页面 select/include 所访问的字段，避免渲染期崩溃。
 */
export function getMockResult(model: string, method: string, args: any[]): any {
  const opt = args && args[0] ? args[0] : {}
  switch (model) {
    case "game": {
      if (method === "count") return MOCK_GAMES.length
      if (method === "findUnique" || method === "findFirst") return MOCK_GAMES[0]
      if (method === "findMany") {
        const take = typeof opt.take === "number" ? opt.take : MOCK_GAMES.length
        const skip = typeof opt.skip === "number" ? opt.skip : 0
        return MOCK_GAMES.slice(skip, skip + take)
      }
      return MOCK_GAMES
    }
    case "checkIn":
      if (method === "count") return 128
      return 0
    case "announcement":
      if (method === "findMany") return MOCK_ANNOUNCEMENTS
      return []
    case "tagGroup":
      if (method === "findFirst" || method === "findUnique") return MOCK_TAG_GROUP
      if (method === "findMany") return [MOCK_TAG_GROUP]
      return null
    case "gameRating":
      if (method === "aggregate") return { _avg: { score: null }, _count: { score: 0 } }
      return null
    case "favorite":
      if (method === "findUnique") return null
      if (method === "findMany") return []
      return null
    case "comment":
      if (method === "findMany") return MOCK_COMMENTS
      if (method === "count") return MOCK_COMMENTS.length
      return []
    case "creator":
      if (method === "findMany") return MOCK_GAMES.flatMap((g) => g.creators.map((c: any) => c.creator))
      if (method === "findFirst" || method === "findUnique")
        return MOCK_GAMES[0].creators[0].creator
      if (method === "count") return MOCK_GAMES.length * 2
      return []
    case "user":
      if (method === "count") return 1
      if (method === "findUnique" || method === "findFirst") return MOCK_USER
      if (method === "findMany") return [MOCK_USER]
      return null
    case "siteSetting":
      if (method === "findUnique" || method === "findFirst") return null
      if (method === "findMany") return []
      return null
    case "tag":
      if (method === "findMany")
        return Array.from(new Set(MOCK_GAMES.flatMap((g) => g.tags.map((t: any) => t.tag.name)))).map(
          (name, i) => ({ id: `mt_${i}`, name, color: TAG_COLORS[i % TAG_COLORS.length] }),
        )
      return []
    default:
      if (method === "count") return 0
      if (method === "findMany") return []
      if (method === "findUnique" || method === "findFirst") return null
      return []
  }
}
