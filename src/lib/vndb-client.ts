/**
 * VNDB 客户端 API（浏览器端直接调用）
 * 用于绕过服务器网络限制，从用户浏览器直接请求 VNDB API
 */

const VNDB_BASE = "https://api.vndb.org/kana"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function vndbPost(endpoint: string, data: any, retries = 2): Promise<any> {
  const url = `${VNDB_BASE}/${endpoint}`
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "FangameNext/1.0",
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error(`VNDB HTTP error: ${response.status}`)
        }
        throw new Error(`VNDB HTTP error: ${response.status}`)
      }

      return await response.json()
    } catch (error: any) {
      const isLastAttempt = attempt === retries
      if (isLastAttempt) throw error
      
      // 网络错误则重试
      if (error?.message?.includes('fetch failed') || error?.name === 'TimeoutError') {
        await new Promise(r => setTimeout(r, 1000 * attempt))
      } else {
        throw error
      }
    }
  }
  throw new Error("VNDB request failed")
}

/**
 * 获取随机 staff 创作者（客户端）
 */
export async function getRandomStaff() {
  const searchTerms = [
    "あ", "か", "さ", "た", "な", "は", "ma", "ら", "わ",
    "い", "き", "shi", "chi", "に", "hi", "mi", "ri",
    "う", "く", "su", "tsu", "nu", "fu", "mu", "yu", "ru",
    "え", "お", "ke", "ko", "se", "so", "te", "to", "ne", "no",
    "a", "s", "m", "k", "t", "n", "h", "r", "y", "w"
  ]
  
  // 打乱顺序，尝试最多 5 个不同的搜索词
  const shuffled = [...searchTerms].sort(() => Math.random() - 0.5)
  const attempts = shuffled.slice(0, 5)
  
  for (const term of attempts) {
    try {
      
      const data = await vndbPost("staff", {
        filters: ["search", "=", term],
        fields: "id,name,original,description,gender,vns.role,vns.title",
        results: 25,
      })
      
      const staffList = (data.results || []).filter((s: any) => s.id)
      if (staffList.length > 0) {
        // 优先选择有作品的 staff
        const withWorks = staffList.filter((s: any) => s.vns && s.vns.length > 0)
        const pool = withWorks.length > 0 ? withWorks : staffList
        
        const staff = pool[Math.floor(Math.random() * pool.length)]
        
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
          source: "vndb-staff",
        }
      }
    } catch (error) {
      console.warn(`[VNDB Client] 关键词 "${term}" 搜索失败:`, error instanceof Error ? error.message : error)
    }
  }
  
  return null
}

/**
 * 获取随机 producer 创作者（客户端，fallback）
 */
export async function getRandomProducer() {
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
  
  const data = await vndbPost("producer", {
    filters: ["id", "=", randomId],
    fields: "id,name,original,description,type",
    results: 1,
  })
  
  const producers = data.results || []
  if (producers.length === 0) return null

  const producer = producers[0]
  return {
    id: producer.id,
    name: producer.name || "未知创作者",
    original: producer.original,
    image: producer.image?.url,
    vndbId: producer.id.replace("p", ""),
    type: producer.type,
    description: producer.description,
    source: "vndb-producer",
  }
}

/**
 * 获取随机角色（客户端）
 */
export async function getRandomCharacter() {
  
  const popularSearches = ["fate", "clannad", "steins", "muv-luv", "grisaia", "little busters", "rewrite", "angel beats", "danganronpa", "zero escape"]
  const randomSearch = popularSearches[Math.floor(Math.random() * popularSearches.length)]
  
  const vnData = await vndbPost("vn", {
    filters: ["search", "=", randomSearch],
    fields: "id,title,va.character.id,va.character.name,va.character.original,va.character.aliases,va.character.description,va.character.image.url,va.character.blood_type,va.character.birthday,va.character.age,va.character.gender,va.character.height,va.character.weight,va.character.bust,va.character.waist,va.character.hips,va.character.cup,va.character.traits.id,va.character.traits.name,va.character.traits.group_id,va.character.traits.group_name,va.character.traits.spoiler",
    results: 5,
    sort: "rating",
    reverse: true,
  })

  const vns = vnData.results || []
  if (vns.length === 0) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  if (allCharacters.length === 0) return null

  const randomIndex = Math.floor(Math.random() * allCharacters.length)
  const { character, vnTitle } = allCharacters[randomIndex]

  const traits = character.traits
    ?.filter((t: any) => t.spoiler === 0)
    .map((t: any) => ({ name: t.name, groupName: t.group_name })) || []

  return {
    id: character.id,
    name: character.name || "未知角色",
    original: character.original,
    image: character.image?.url,
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
    vndbId: character.id.replace("c", ""),
  }
}