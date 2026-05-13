/**
 * VNDB API 客户端
 * 用于从 VNDB 获取视觉小说和创作者信息
 * API 文档: https://vndb.org/d11
 * 
 * 使用 HTTP API (api.vndb.org/kana)
 * 因为服务器防火墙阻止了 TCP 端口 19535
 * 
 * 缓存策略：优先使用 Redis（Upstash），未配置时降级为内存缓存
 */
import { cache, cached, cacheKey } from "./redis"

interface VNDBCharacter {
  id: string
  name: string
  original: string
  aliases?: string[]
  description?: string
  image?: { url: string } | string
  blood_type?: string
  birthday?: number[] // [month, day]
  age?: number | string
  gender?: string[]
  height?: number | string
  weight?: number | string
  bust?: number | string
  waist?: number | string
  hips?: number | string
  cup?: string
  trait?: Array<{
    id: string
    name: string
    group_id: string
    group_name: string
    spoiler: number
  }>
  vns?: Array<{
    id: string
    title: string
    role: string // main, primary, side, appears
    spoiler: number
  }>
  role?: string // main, primary, side (from va relation)
}

interface VNDBProducer {
  id: string
  name: string
  original: string
  type: string // company, individual
}

interface VNDBVisualNovel {
  id: string
  title: string
  alttitle: string
  description: string
  tags: Array<{ id: string; name: string; rating: number }>
  developers: VNDBProducer[]
  va: Array<{
    character: VNDBCharacter
  }>
}

interface VNDBSearchResult {
  results: Array<{
    id: string
    title?: string
    name?: string
    original?: string
    image?: string
    rating?: number
  }>
  more: boolean
}

class VNDBClient {
  // 使用 HTTP API endpoint
  private baseUrl = "https://api.vndb.org/kana"
  private CACHE_TTL = 24 * 60 * 60 // 24小时缓存（秒）
  private dispatcher: any = null
  private proxyInitialized = false
  
  // 熔断器：当 VNDB 不可达时快速失败，避免长时间阻塞
  private circuitBroken = false
  private circuitBrokenUntil = 0
  private CIRCUIT_BREAK_DURATION = 5 * 60 * 1000 // 5分钟

  /**
   * 初始化代理（延迟加载，避免 import 失败影响启动）
   */
  private async initProxy() {
    if (this.proxyInitialized) return
    this.proxyInitialized = true

    const proxyUrl = process.env.VNDB_API_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY
    if (!proxyUrl) {
      console.log("[VNDB] 未配置代理，直连 API")
      return
    }

    try {
      // @ts-ignore - undici 是 Node.js 内置模块，运行时可用
      const undici = await import("undici")
      this.dispatcher = new undici.ProxyAgent(proxyUrl)
      console.log("[VNDB] 已配置代理:", proxyUrl.replace(/\/\/[^:]+:[^@]+@/, "//***:***@"))
    } catch (e) {
      console.warn("[VNDB] 无法加载 undici ProxyAgent，将使用直连:", e)
    }
  }

  /**
   * 发送 HTTP POST 请求到 VNDB API（带重试机制 + 代理支持 + 熔断器）
   */
  private async sendRequest(endpoint: string, data: any, retries = 2): Promise<any> {
    // 熔断器检查：如果 VNDB 之前不可达，直接快速失败
    if (this.circuitBroken && Date.now() < this.circuitBrokenUntil) {
      console.log("[VNDB] 熔断器已触发，快速失败（剩余", Math.ceil((this.circuitBrokenUntil - Date.now()) / 1000), "秒）")
      throw new Error("VNDB API 不可达（熔断器已触发）")
    }
    
    await this.initProxy()
    
    const url = `${this.baseUrl}/${endpoint}`
    console.log("[VNDB] 发送 HTTP 请求:", url)
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const fetchOptions: any = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "FangameNext/1.0",
          },
          body: JSON.stringify(data),
          signal: AbortSignal.timeout(10000), // 10秒超时
        }
        // undici 的 ProxyAgent 需要通过 dispatcher 参数传递
        if (this.dispatcher) {
          fetchOptions.dispatcher = this.dispatcher
        }
        const response = await fetch(url, fetchOptions)

        if (!response.ok) {
          const errorBody = await response.text().catch(() => "unknown")
          console.error(`[VNDB] HTTP error body:`, errorBody)
          // 400 错误不重试（参数问题）
          if (response.status === 400) {
            throw new Error(`VNDB HTTP error: ${response.status} ${response.statusText} - ${errorBody}`)
          }
          throw new Error(`VNDB HTTP error: ${response.status} ${response.statusText}`)
        }

        const result = await response.json()
        console.log("[VNDB] 响应成功，结果数量:", result.results?.length || 0)
        return result
      } catch (error: any) {
        const isTimeout = error?.code === 'ETIMEDOUT' || error?.code === 'UND_ERR_CONNECT_TIMEOUT' || error?.name === 'TimeoutError'
        const isLastAttempt = attempt === retries
        
        if (isLastAttempt) {
          console.error(`[VNDB] 请求失败（已重试 ${retries} 次）:`, error.message)
          // 触发熔断器：网络不可达时，后续请求快速失败
          if (isTimeout || error?.message?.includes('fetch failed') || error?.code === 'ECONNREFUSED') {
            this.circuitBroken = true
            this.circuitBrokenUntil = Date.now() + this.CIRCUIT_BREAK_DURATION
            console.log(`[VNDB] 熔断器已触发，${this.CIRCUIT_BREAK_DURATION / 1000}秒内不再尝试`)
          }
          throw error
        }
        
        if (isTimeout || error?.message?.includes('fetch failed') || error?.code === 'ECONNREFUSED') {
          const delay = attempt * 500 // 递增延迟: 500ms
          console.log(`[VNDB] 请求超时，${delay}ms 后重试 (${attempt}/${retries})...`)
          await new Promise(r => setTimeout(r, delay))
        } else {
          throw error // 非网络错误直接抛出
        }
      }
    }
    throw new Error("VNDB request failed after all retries")
  }

  /**
   * 搜索视觉小说
   */
  async searchVisualNovels(query: string, limit = 10): Promise<VNDBSearchResult> {
    const key = cacheKey("vndb", "vn_search", query, limit)
    try {
      return await cached(key, async () => {
        return await this.sendRequest("vn", {
          filters: ["search", "=", query],
          fields: "id,title,alttitle,rating,image.url",
          results: limit,
        })
      }, this.CACHE_TTL)
    } catch (error) {
      console.error("VNDB search failed:", error)
      throw error
    }
  }

  /**
   * 获取视觉小说详情
   */
  async getVisualNovel(id: string): Promise<VNDBVisualNovel | null> {
    const key = cacheKey("vndb", "vn_detail", id)
    try {
      return await cached(key, async () => {
        const data = await this.sendRequest("vn", {
          filters: ["id", "=", id],
          fields: "id,title,alttitle,description,tags.id,tags.name,tags.rating,developers.id,developers.name,developers.original,developers.type,va.character.id,va.character.name,va.character.original,va.character.aliases,va.character.description,va.character.image.url,va.character.blood_type,va.character.birthday,va.character.age,va.character.gender,va.character.height,va.character.weight,va.character.bust,va.character.waist,va.character.hips,va.character.cup,va.character.traits.id,va.character.traits.name,va.character.traits.group_id,va.character.traits.group_name,va.character.traits.spoiler",
        })
        
        if (!data.results || data.results.length === 0) {
          return null
        }
        
        return data.results[0]
      }, this.CACHE_TTL)
    } catch (error) {
      console.error("Failed to fetch VN details:", error)
      return null
    }
  }

  /**
   * 搜索创作者（个人）
   */
  async searchProducers(query: string, limit = 10): Promise<VNDBSearchResult> {
    const key = cacheKey("vndb", "producer_search", query, limit)
    try {
      return await cached(key, async () => {
        return await this.sendRequest("producer", {
          filters: ["search", "=", query],
          fields: "id,name,original,description,type",
          results: limit,
        })
      }, this.CACHE_TTL)
    } catch (error) {
      console.error("VNDB producer search failed:", error)
      throw error
    }
  }

  /**
   * 获取随机 galgame 创作者（脚本家、画师、音乐人等）
   * 使用多个搜索关键词获取更多创作者
   */
  async getRandomDoujinCreator(): Promise<{
    id: string
    name: string
    original?: string
    image?: string
    vndbId: string
    type?: string
    description?: string
  } | null> {
    try {
      console.log("[VNDB] 开始获取随机 galgame 创作者...")
      
      // 直接通过 ID 获取随机创作者（避免搜索 API 不稳定）
      const knownIds = [
        "p1", "p4", "p10", "p12", "p13", "p17", "p26", "p37", "p41", "p46",
        "p51", "p54", "p58", "p62", "p65", "p78", "p86", "p103", "p108", "p111",
        "p114", "p128", "p130", "p131", "p133", "p134", "p135", "p136", "p137", "p138",
        "p139", "p140", "p141", "p142", "p143", "p144", "p145", "p146", "p147", "p148",
        "p149", "p150", "p151", "p152", "p153", "p154", "p155", "p156", "p157", "p158",
        "p159", "p160", "p161", "p162", "p163", "p164", "p165", "p166", "p167", "p168",
        "p169", "p170", "p171", "p172", "p173", "p174", "p175", "p176", "p177", "p178",
        "p179", "p180", "p181", "p182", "p183", "p184", "p185", "p186", "p187", "p188",
        "p189", "p190", "p191", "p192", "p193", "p194", "p195", "p196", "p197", "p198",
        "p199", "p200", "p201", "p202", "p203", "p204", "p205", "p206", "p207", "p208",
        "p209", "p210", "p211", "p212", "p213", "p214", "p215", "p216", "p217", "p218",
        "p219", "p220", "p221", "p222", "p223", "p224", "p225", "p226", "p227", "p228",
        "p229", "p230", "p231", "p232", "p233", "p234", "p235", "p236", "p237", "p238",
        "p239", "p240", "p241", "p242", "p243", "p244", "p245", "p246", "p247", "p248",
        "p249", "p250", "p251", "p252", "p253", "p254", "p255", "p256", "p257", "p258",
        "p259", "p260", "p261", "p262", "p263", "p264", "p265", "p266", "p267", "p268",
        "p269", "p270", "p271", "p272", "p273", "p274", "p275", "p276", "p277", "p278",
        "p279", "p280", "p281", "p282", "p283", "p284", "p285", "p286", "p287", "p288",
        "p289", "p290", "p291", "p292", "p293", "p294", "p295", "p296", "p297", "p298",
        "p299", "p300", "p301", "p302", "p303", "p304", "p305", "p306", "p307", "p308",
        "p309", "p310", "p311", "p312", "p313", "p314", "p315", "p316", "p317", "p318",
        "p319", "p320", "p321", "p322", "p323", "p324", "p325", "p326", "p327", "p328",
        "p329", "p330", "p331", "p332", "p333", "p334", "p335", "p336", "p337", "p338",
        "p339", "p340", "p341", "p342", "p343", "p344", "p345", "p346", "p347", "p348",
        "p349", "p350", "p351", "p352", "p353", "p354", "p355", "p356", "p357", "p358",
        "p359", "p360", "p361", "p362", "p363", "p364", "p365", "p366", "p367", "p368",
        "p369", "p370", "p371", "p372", "p373", "p374", "p375", "p376", "p377", "p378",
        "p379", "p380", "p381", "p382", "p383", "p384", "p385", "p386", "p387", "p388",
        "p389", "p390", "p391", "p392", "p393", "p394", "p395", "p396", "p397", "p398",
        "p399", "p400", "p401", "p402", "p403", "p404", "p405", "p406", "p407", "p408",
        "p409", "p410", "p411", "p412", "p413", "p414", "p415", "p416", "p417", "p418",
        "p419", "p420", "p421", "p422", "p423", "p424", "p425", "p426", "p427", "p428",
        "p429", "p430", "p431", "p432", "p433", "p434", "p435", "p436", "p437", "p438",
        "p439", "p440", "p441", "p442", "p443", "p444", "p445", "p446", "p447", "p448",
        "p449", "p450", "p451", "p452", "p453", "p454", "p455", "p456", "p457", "p458",
        "p459", "p460", "p461", "p462", "p463", "p464", "p465", "p466", "p467", "p468",
        "p469", "p470", "p471", "p472", "p473", "p474", "p475", "p476", "p477", "p478",
        "p479", "p480", "p481", "p482", "p483", "p484", "p485", "p486", "p487", "p488",
        "p489", "p490", "p491", "p492", "p493", "p494", "p495", "p496", "p497", "p498",
        "p499", "p500", "p501", "p502", "p503", "p504", "p505", "p506", "p507", "p508",
        "p509", "p510", "p511", "p512", "p513", "p514", "p515", "p516", "p517", "p518",
        "p519", "p520", "p521", "p522", "p523", "p524", "p525", "p526", "p527", "p528",
        "p529", "p530", "p531", "p532", "p533", "p534", "p535", "p536", "p537", "p538",
        "p539", "p540", "p541", "p542", "p543", "p544", "p545", "p546", "p547", "p548",
        "p549", "p550", "p551", "p552", "p553", "p554", "p555", "p556", "p557", "p558",
        "p559", "p560", "p561", "p562", "p563", "p564", "p565", "p566", "p567", "p568",
        "p569", "p570", "p571", "p572", "p573", "p574", "p575", "p576", "p577", "p578",
        "p579", "p580", "p581", "p582", "p583", "p584", "p585", "p586", "p587", "p588",
        "p589", "p590", "p591", "p592", "p593", "p594", "p595", "p596", "p597", "p598",
        "p599", "p600", "p601", "p602", "p603", "p604", "p605", "p606", "p607", "p608",
        "p609", "p610", "p611", "p612", "p613", "p614", "p615", "p616", "p617", "p618",
        "p619", "p620", "p621", "p622", "p623", "p624", "p625", "p626", "p627", "p628",
        "p629", "p630", "p631", "p632", "p633", "p634", "p635", "p636", "p637", "p638",
        "p639", "p640", "p641", "p642", "p643", "p644", "p645", "p646", "p647", "p648",
        "p649", "p650", "p651", "p652", "p653", "p654", "p655", "p656", "p657", "p658",
        "p659", "p660", "p661", "p662", "p663", "p664", "p665", "p666", "p667", "p668",
        "p669", "p670", "p671", "p672", "p673", "p674", "p675", "p676", "p677", "p678",
        "p679", "p680", "p681", "p682", "p683", "p684", "p685", "p686", "p687", "p688",
        "p689", "p690", "p691", "p692", "p693", "p694", "p695", "p696", "p697", "p698",
        "p699", "p700", "p701", "p702", "p703", "p704", "p705", "p706", "p707", "p708",
        "p709", "p710", "p711", "p712", "p713", "p714", "p715", "p716", "p717", "p718",
        "p719", "p720", "p721", "p722", "p723", "p724", "p725", "p726", "p727", "p728",
        "p729", "p730", "p731", "p732", "p733", "p734", "p735", "p736", "p737", "p738",
        "p739", "p740", "p741", "p742", "p743", "p744", "p745", "p746", "p747", "p748",
        "p749", "p750", "p751", "p752", "p753", "p754", "p755", "p756", "p757", "p758",
        "p759", "p760", "p761", "p762", "p763", "p764", "p765", "p766", "p767", "p768",
        "p769", "p770", "p771", "p772", "p773", "p774", "p775", "p776", "p777", "p778",
        "p779", "p780", "p781", "p782", "p783", "p784", "p785", "p786", "p787", "p788",
        "p789", "p790", "p791", "p792", "p793", "p794", "p795", "p796", "p797", "p798",
        "p799", "p800", "p801", "p802", "p803", "p804", "p805", "p806", "p807", "p808",
        "p809", "p810", "p811", "p812", "p813", "p814", "p815", "p816", "p817", "p818",
        "p819", "p820", "p821", "p822", "p823", "p824", "p825", "p826", "p827", "p828",
        "p829", "p830", "p831", "p832", "p833", "p834", "p835", "p836", "p837", "p838",
        "p839", "p840", "p841", "p842", "p843", "p844", "p845", "p846", "p847", "p848",
        "p849", "p850", "p851", "p852", "p853", "p854", "p855", "p856", "p857", "p858",
        "p859", "p860", "p861", "p862", "p863", "p864", "p865", "p866", "p867", "p868",
        "p869", "p870", "p871", "p872", "p873", "p874", "p875", "p876", "p877", "p878",
        "p879", "p880", "p881", "p882", "p883", "p884", "p885", "p886", "p887", "p888",
        "p889", "p890", "p891", "p892", "p893", "p894", "p895", "p896", "p897", "p898",
        "p899", "p900", "p901", "p902", "p903", "p904", "p905", "p906", "p907", "p908",
        "p909", "p910", "p911", "p912", "p913", "p914", "p915", "p916", "p917", "p918",
        "p919", "p920", "p921", "p922", "p923", "p924", "p925", "p926", "p927", "p928",
        "p929", "p930", "p931", "p932", "p933", "p934", "p935", "p936", "p937", "p938",
        "p939", "p940", "p941", "p942", "p943", "p944", "p945", "p946", "p947", "p948",
        "p949", "p950", "p951", "p952", "p953", "p954", "p955", "p956", "p957", "p958",
        "p959", "p960", "p961", "p962", "p963", "p964", "p965", "p966", "p967", "p968",
        "p969", "p970", "p971", "p972", "p973", "p974", "p975", "p976", "p977", "p978",
        "p979", "p980", "p981", "p982", "p983", "p984", "p985", "p986", "p987", "p988",
        "p989", "p990", "p991", "p992", "p993", "p994", "p995", "p996", "p997", "p998",
        "p999", "p1000"
      ]

      const randomId = knownIds[Math.floor(Math.random() * knownIds.length)]
      console.log(`[VNDB] 直接获取创作者: ${randomId}`)
      
      const data = await this.sendRequest("producer", {
        filters: ["id", "=", randomId],
        fields: "id,name,original,description,type",
        results: 1,
      })
      
      const producers = data.results || []

      if (producers.length === 0) {
        console.log("[VNDB] 未找到创作者数据")
        return null
      }

      const producer = producers[0]

      console.log(`[VNDB] 选中创作者: ${producer.name} (ID: ${producer.id})`)

      return {
        id: producer.id,
        name: producer.name || "未知创作者",
        original: producer.original,
        image: producer.image?.url,
        vndbId: producer.id.replace("p", ""),
        type: producer.type,
        description: producer.description,
      }
    } catch (error) {
      console.error("[VNDB] Failed to fetch random creator:", error)
      return null
    }
  }

  /**
   * 获取随机创作者（staff - 个人创作者，有明确角色如脚本/原画/音乐）
   */
  async getRandomStaffMember(): Promise<{
    id: string
    name: string
    original?: string
    description?: string
    gender?: string
    vndbId: string
    roles: string[]
    vns: Array<{
      id: string
      title: string
      original?: string
      role: string
      rating?: number
      image?: string
    }>
  } | null> {
    const searchTerms = [
      "あ", "か", "さ", "た", "な", "は", "ma", "ら", "わ",
      "い", "き", "shi", "chi", "に", "hi", "mi", "ri",
      "う", "く", "su", "tsu", "nu", "fu", "mu", "yu", "ru",
      "え", "お", "ke", "ko", "se", "so", "te", "to", "ne", "no",
      // 也加入一些常见英文名字做搜索
      "a", "s", "m", "k", "t", "n", "h", "r", "y", "w"
    ]
    
    // 打乱顺序，尝试最多 5 个不同的搜索词（增加命中率）
    const shuffled = [...searchTerms].sort(() => Math.random() - 0.5)
    const attempts = shuffled.slice(0, 5)
    
    for (const term of attempts) {
      try {
        console.log(`[VNDB] 尝试搜索 staff，关键词: "${term}"`)
        
        const data = await this.sendRequest("staff", {
          filters: ["search", "=", term],
          fields: "id,name,original,description,gender,vns.role,vns.title,vns.id",
          results: 25,
        })
        
        const staffList = (data.results || []).filter((s: any) => s.id)
        if (staffList.length > 0) {
          // 优先选择有作品的 staff
          const withWorks = staffList.filter((s: any) => s.vns && s.vns.length > 0)
          const pool = withWorks.length > 0 ? withWorks : staffList
          
          const staff = pool[Math.floor(Math.random() * pool.length)]
          console.log(`[VNDB] 选中 staff: ${staff.name} (ID: ${staff.id}, 作品数: ${staff.vns?.length || 0})`)
          
          const roles = [...new Set((staff.vns || []).map((v: any) => v.role).filter(Boolean))] as string[]
          const vns = (staff.vns || []).slice(0, 10).map((v: any) => ({
            id: v.id || "",
            title: v.title || "",
            original: v.original || "",
            role: v.role || "",
            rating: v.rating,
            image: v.image?.url,
          }))
          
          return {
            id: staff.id,
            name: staff.name,
            original: staff.original,
            description: staff.description,
            gender: staff.gender,
            vndbId: staff.id.replace("s", ""),
            roles,
            vns,
          }
        }
        
        console.log(`[VNDB] 关键词 "${term}" 未找到 staff 数据，尝试下一个...`)
      } catch (error) {
        console.warn(`[VNDB] 关键词 "${term}" 搜索失败:`, error instanceof Error ? error.message : error)
        // 继续尝试下一个关键词
      }
    }
    
    console.warn("[VNDB] 所有搜索关键词均未获取到 staff 数据")
    return null
  }

  /**
   * 获取 staff 创作者详情（含参与的作品和角色）
   */
  async getStaffDetail(vndbId: string): Promise<{
    id: string
    name: string
    original?: string
    description?: string
    gender?: string
    vndbId: string
    roles: string[]
    vns: Array<{
      id: string
      title: string
      original?: string
      role: string
      rating?: number
      image?: string
    }>
  } | null> {
    const key = cacheKey("vndb", "staff_detail", vndbId)
    try {
      return await cached(key, async () => {
        const data = await this.sendRequest("staff", {
          filters: ["id", "=", `s${vndbId}`],
          fields: "id,name,original,description,gender",
          results: 1,
        })
        
        if (!data.results || data.results.length === 0) return null
        
        const staff = data.results[0]
        
        return {
          id: staff.id,
          name: staff.name,
          original: staff.original,
          description: staff.description,
          gender: staff.gender,
          vndbId: staff.id.replace("s", ""),
          roles: [],
          vns: [],
        }
      }, this.CACHE_TTL)
    } catch (error) {
      console.error("[VNDB] Failed to fetch staff detail:", error)
      return null
    }
  }

  /**
   * 获取创作者详情（含开发的作品）
   */
  async getProducer(vndbId: string): Promise<{
    id: string
    name: string
    original?: string
    type: string
    description?: string
    image?: { url: string }
    developed?: Array<{
      id: string
      title: string
      image?: { url: string }
      rating?: number
    }>
  } | null> {
    const key = cacheKey("vndb", "producer_detail", vndbId)
    try {
      return await cached(key, async () => {
        // 获取创作者基本信息
        const data = await this.sendRequest("producer", {
          filters: ["id", "=", `p${vndbId}`],
          fields: "id,name,original,type,description",
          results: 1,
        })

        if (!data.results || data.results.length === 0) {
          return null
        }

        const producer = data.results[0]

        // 通过搜索该创作者名称获取其开发的VN
        try {
          const vnData = await this.sendRequest("vn", {
            filters: ["search", "=", producer.name],
            fields: "id,title,rating,image.url",
            results: 10,
            sort: "rating",
            reverse: true,
          })
          producer.developed = vnData.results || []
        } catch {
          producer.developed = []
        }

        return producer
      }, this.CACHE_TTL)
    } catch (error) {
      console.error("Failed to fetch producer details:", error)
      return null
    }
  }

  /**
   * 验证 VNDB ID 是否为同人作品
   */
  async validateDoujinWork(vndbId: string): Promise<{
    isValid: boolean
    isDoujin: boolean
    title?: string
    tags?: string[]
  }> {
    try {
      const vn = await this.getVisualNovel(`v${vndbId}`)
      
      if (!vn) {
        return { isValid: false, isDoujin: false }
      }

      // 检查是否包含同人标签
      const doujinTags = ["doujin", "doujin soft", "indie"]
      const hasDoujinTag = vn.tags?.some(tag => 
        doujinTags.some(dt => tag.name.toLowerCase().includes(dt))
      ) || false

      return {
        isValid: true,
        isDoujin: hasDoujinTag,
        title: vn.title,
        tags: vn.tags?.map(t => t.name),
      }
    } catch (error) {
      console.error("Failed to validate VNDB work:", error)
      return { isValid: false, isDoujin: false }
    }
  }

  /**
   * 从 VNDB ID 自动填充游戏信息
   */
  async autoFillFromVNDB(vndbId: string): Promise<{
    title?: string
    original?: string
    description?: string
    tags?: string[]
    creators?: Array<{ name: string; role: string }>
  } | null> {
    try {
      const vn = await this.getVisualNovel(`v${vndbId}`)
      
      if (!vn) return null

      // 提取标签
      const tags = vn.tags
        ?.filter(t => t.rating > 0)
        .map(t => t.name)
        .slice(0, 10) || []

      // 提取创作者信息
      const creators = vn.developers
        ?.map(dev => ({
          name: dev.original || dev.name,
          role: "开发者",
        }))
        .slice(0, 5) || []

      return {
        title: vn.title,
        original: vn.alttitle,
        description: vn.description,
        tags,
        creators,
      }
    } catch (error) {
      console.error("Failed to auto-fill from VNDB:", error)
      return null
    }
  }

  /**
   * 获取角色详情（通过 VNDB character ID）
   */
  async getCharacterDetail(charId: string): Promise<{
    id: string
    name: string
    original?: string
    image?: string
    role?: string
    gender?: string[]
    age?: number | string
    birthday?: number[]
    bloodType?: string
    height?: number | string
    weight?: number | string
    bust?: number | string
    waist?: number | string
    hips?: number | string
    cup?: string
    description?: string
    aliases?: string[]
    traits?: Array<{ name: string; groupName: string }>
    vnTitle?: string
  } | null> {
    const key = cacheKey("vndb", "char_detail", charId)
    try {
      return await cached(key, async () => {
        // 确保 character ID 有 "c" 前缀（VNDB 格式）
        const fullCharId = charId.startsWith("c") ? charId : `c${charId}`
        const data = await this.sendRequest("character", {
          filters: ["id", "=", fullCharId],
          fields: "id,name,original,aliases,description,image.url,blood_type,birthday,age,gender,height,weight,bust,waist,hips,cup,traits.id,traits.name,traits.group_id,traits.group_name,traits.spoiler,vns.id,vns.title,vns.role,vns.spoiler",
          results: 1,
        })

        if (!data.results || data.results.length === 0) {
          return null
        }

        const c = data.results[0]
        const vn = c.vns?.[0]

        return {
          id: c.id,
          name: c.name || "未知角色",
          original: c.original || "",
          image: c.image?.url || "",
          role: vn?.role || "",
          gender: c.gender || [],
          age: c.age || null,
          birthday: c.birthday || null,
          bloodType: c.blood_type || "",
          height: c.height || "",
          weight: c.weight || "",
          bust: c.bust || "",
          waist: c.waist || "",
          hips: c.hips || "",
          cup: c.cup || "",
          description: c.description || "",
          aliases: c.aliases || [],
          traits: (c.traits || [])
            .filter((t: any) => t.spoiler === 0)
            .map((t: any) => ({ name: t.name, groupName: t.group_name })),
          vnTitle: vn?.title || "",
        }
      }, this.CACHE_TTL)
    } catch (error) {
      console.error("[VNDB] Failed to fetch character detail:", error)
      return null
    }
  }

  /**
   * 获取随机游戏角色
   */
  async getRandomCharacter(): Promise<{
    id: string
    name: string
    original?: string
    image?: string
    role?: string
    gender?: string[]
    age?: number | string
    birthday?: number[]
    bloodType?: string
    height?: number | string
    weight?: number | string
    bust?: number | string
    waist?: number | string
    hips?: number | string
    cup?: string
    description?: string
    aliases?: string[]
    traits?: Array<{ name: string; groupName: string }>
    vnTitle?: string
  } | null> {
    try {
      console.log("[VNDB] 开始获取随机游戏角色...")
      
      // 搜索热门角色（通过搜索知名VN获取角色）
      const popularSearches = ["fate", "clannad", "steins", "muv-luv", "grisaia", "little busters", "rewrite", "angel beats", "danganronpa", "zero escape"]
      const randomSearch = popularSearches[Math.floor(Math.random() * popularSearches.length)]
      
      const vnData = await this.sendRequest("vn", {
        filters: ["search", "=", randomSearch],
        fields: "id,title,va.character.id,va.character.name,va.character.original,va.character.aliases,va.character.description,va.character.image.url,va.character.blood_type,va.character.birthday,va.character.age,va.character.gender,va.character.height,va.character.weight,va.character.bust,va.character.waist,va.character.hips,va.character.cup,va.character.traits.id,va.character.traits.name,va.character.traits.group_id,va.character.traits.group_name,va.character.traits.spoiler",
        results: 5,
        sort: "rating",
        reverse: true,
      })

      const vns = vnData.results || []
      if (vns.length === 0) {
        console.log("[VNDB] 未找到VN数据")
        return null
      }

      // 收集所有角色
      const allCharacters: Array<{ character: any; vnTitle: string }> = []
      for (const vn of vns) {
        if (vn.va) {
          for (const va of vn.va) {
            if (va.character) {
              allCharacters.push({ character: va.character, vnTitle: vn.title })
            }
          }
        }
      }

      if (allCharacters.length === 0) {
        console.log("[VNDB] 未找到角色数据")
        return null
      }

      // 随机选择一个角色
      const randomIndex = Math.floor(Math.random() * allCharacters.length)
      const { character, vnTitle } = allCharacters[randomIndex]

      console.log(`[VNDB] 选中角色: ${character.name} (ID: ${character.id})`)

      // 处理图片URL
      let imageUrl: string | undefined
      if (character.image?.url) {
        imageUrl = character.image.url
      }

      // 处理特征
      const traits = character.traits
        ?.filter((t: any) => t.spoiler === 0)
        .map((t: any) => ({ name: t.name, groupName: t.group_name })) || []

      return {
        id: character.id,
        name: character.name || "未知角色",
        original: character.original,
        image: imageUrl,
        role: character.role,
        gender: character.gender,
        age: character.age,
        birthday: character.birthday,
        bloodType: character.blood_type,
        height: character.height,
        weight: character.weight,
        bust: character.bust,
        waist: character.waist,
        hips: character.hips,
        cup: character.cup,
        description: character.description,
        aliases: character.aliases,
        traits,
        vnTitle,
      }
    } catch (error) {
      console.error("[VNDB] Failed to fetch random character:", error)
      return null
    }
  }

  /**
   * 映射角色职责
   */
  private mapCharacterRole(role: string): string {
    const roleMap: Record<string, string> = {
      main: "主角",
      primary: "主要角色",
      side: "次要角色",
    }
    return roleMap[role] || "角色"
  }

  /**
   * 清除所有缓存
   */
  async clearCache(): Promise<void> {
    await cache.clear()
  }
}

// 导出单例实例
export const vndbClient = new VNDBClient()
export default VNDBClient