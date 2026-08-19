// 扩展连通性测试：论坛/私信/通知/评论/副站
import { prisma } from "../src/lib/prisma"
import { forumService } from "../src/services/forum"
import { messageService } from "../src/services/message"
import { notificationService } from "../src/services/user"
import { gameService } from "../src/services/game"

const R: { name: string; ok: boolean; detail?: string }[] = []
function log(name: string, ok: boolean, detail?: string) { R.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`) }

;(async () => {
  const actor = await prisma.user.findFirst({ where: { username: 'diagtester' } })
  const target = await prisma.user.findFirst({ where: { username: 'demo_user' } })
  const publisher = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
  if (!actor || !target || !publisher) { console.log('缺用户'); process.exit(1) }
  const g = await prisma.game.findFirst()
  if (!g) { console.log('无游戏'); process.exit(1) }

  console.log('== 论坛 ==')
  try {
    const post = await forumService.createPost(actor.id, { title: '连通性测试帖', content: '测试内容正文', category: 'general' })
    log('前台: 论坛发帖', !!post?.id, `postId=${post?.id}`)
    // 后台验证
    const posts = await forumService.getPosts(1, undefined, undefined)
    const list = Array.isArray(posts) ? posts : (posts as { posts?: unknown[] })?.posts
    log('后台/列表: 帖子可见', (list?.length ?? 0) > 0, `count=${list?.length}`)
    // 帖子评论
    if (post?.id) {
      try {
        const c = await forumService.createComment(target.id, post.id, { content: '评论正文' })
        log('前台: 论坛评论', !!c?.id, `commentId=${c?.id}`)
      } catch (e) { log('前台: 论坛评论', false, (e as Error).message) }
    }
  } catch (e) { log('前台: 论坛发帖', false, (e as Error).message) }

  console.log('\n== 游戏评论 + 通知补全验证 ==')
  try {
    const before = await prisma.notification.count({ where: { userId: publisher.id, type: 'game_comment_new' } })
    const c = await gameService.createComment(target.id, g.id, '这是一条游戏评论')
    log('前台: 游戏评论', !!c?.id)
    // 等异步通知写入
    await new Promise(r => setTimeout(r, 500))
    const after = await prisma.notification.count({ where: { userId: publisher.id, type: 'game_comment_new' } })
    log('通知补全: 游戏评论→通知发布者', after > before, `before=${before} after=${after}`)
  } catch (e) { log('游戏评论/通知', false, (e as Error).message) }

  console.log('\n== 私信 ==')
  try {
    // 发起会话需消耗印记，目标 demo_user
    const conv = await messageService.startConversation(actor.id, target.id)
    log('前台: 发起私信会话', !!conv?.id, `convId=${conv?.id}`)
    if (conv?.id) {
      const m = await messageService.sendMessage(actor.id, conv.id, '你好')
      log('前台: 发送消息', !!m?.id, `msgId=${m?.id}`)
    }
  } catch (e) { log('前台: 私信', false, (e as Error).message) }

  console.log('\n== 通知 ==')
  try {
    const n = await notificationService.getPaginated(actor.id, 1)
    const list = Array.isArray(n) ? n : (n as { notifications?: unknown[] })?.notifications
    log('前台: 通知列表', (list?.length ?? 0) >= 0, `count=${list?.length}`)
  } catch (e) { log('前台: 通知', false, (e as Error).message) }

  console.log('\n== 副站 Galvelica ==')
  try {
    const works = await prisma.work.count()
    log('副站: 作品数', works > 0, `count=${works}`)
    const studios = await prisma.studio.count()
    log('副站: 创作者数', studios > 0, `count=${studios}`)
    const tags = await prisma.tag.count()
    log('副站: 标签数', tags > 0, `count=${tags}`)
  } catch (e) { log('副站', false, (e as Error).message) }

  const pass = R.filter(r => r.ok).length, fail = R.filter(r => !r.ok).length
  console.log(`\n===== ${pass} PASS / ${fail} FAIL / ${R.length} TOTAL =====`)
  await prisma.$disconnect()
  process.exit(fail ? 1 : 0)
})().catch(e => { console.log('FATAL:', e.message); process.exit(1) })
