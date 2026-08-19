// 前后台连通性测试：前台动作(service) → 落库 → 后台读取(adminService)
import { prisma } from "../src/lib/prisma"
import { checkinService, followService } from "../src/services/user"
import { gameService } from "../src/services/game"
import { adminFollowService, adminCheckinService, adminFavoriteService } from "../src/services/admin"

const R: { name: string; ok: boolean; detail?: string }[] = []
function log(name: string, ok: boolean, detail?: string) { R.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`) }

;(async () => {
  const actor = await prisma.user.findFirst({ where: { username: 'func_test' } })
  const target = await prisma.user.findFirst({ where: { username: 'demo_user' } })
  if (!actor || !target) { console.log('缺测试用户'); process.exit(1) }
  const g = await prisma.game.findFirst()
  if (!g) { console.log('无游戏'); process.exit(1) }

  console.log('== 前台动作（写库）==')
  try { const r = await followService.toggle(actor.id, target.id); log('前台: 关注demo_user', true, `favorited=${JSON.stringify(r)?.slice(0,40)}`) }
  catch (e) { log('前台: 关注', false, (e as Error).message) }

  try { const r = await checkinService.checkIn(actor.id); log('前台: 签到', !!r, `streak=${JSON.stringify(r)?.slice(0,40)}`) }
  catch (e) { log('前台: 签到', false, (e as Error).message) }

  try { const r = await gameService.toggleFavorite(actor.id, g.id); log('前台: 收藏游戏', !!r, `favorited=${r.favorited}`) }
  catch (e) { log('前台: 收藏', false, (e as Error).message) }

  try { const r = await gameService.setRating(actor.id, g.id, 5); log('前台: 评分', !!r, JSON.stringify(r)?.slice(0,60)) }
  catch (e) { log('前台: 评分', false, (e as Error).message) }

  console.log('\n== 后台读取（验证前台写入可见）==')
  try { const f = await adminFollowService.getPaginated(1); log('后台: 关注列表', f.follows.length > 0, `count=${f.follows.length}`) }
  catch (e) { log('后台: 关注列表', false, (e as Error).message) }

  try { const c = await adminCheckinService.getPaginated(1); log('后台: 签到记录', c.checkins.length > 0, `count=${c.checkins.length}`) }
  catch (e) { log('后台: 签到记录', false, (e as Error).message) }

  try { const fa = await adminFavoriteService.getPaginated(1); log('后台: 收藏数据', fa.favorites.length > 0, `count=${fa.favorites.length}`) }
  catch (e) { log('后台: 收藏数据', false, (e as Error).message) }

  try { const gb = await prisma.gameRating.groupBy({ by: ['gameId'], _count: { score: true } }); log('后台: 评分聚合', gb.length > 0, `games=${gb.length}`) }
  catch (e) { log('后台: 评分聚合', false, (e as Error).message) }

  const pass = R.filter(r => r.ok).length, fail = R.filter(r => !r.ok).length
  console.log(`\n===== ${pass} PASS / ${fail} FAIL / ${R.length} TOTAL =====`)
  await prisma.$disconnect()
  process.exit(fail ? 1 : 0)
})().catch(e => { console.log('FATAL:', e.message); process.exit(1) })
