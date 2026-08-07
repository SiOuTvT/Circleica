/**
 * NSFWJS 最小可行性测试（沙箱验证用，不连 DB）。
 * 用法：NODE_PATH=<nsfw-runtime>/node_modules tsx scripts/test-nsfw.ts
 * 作用：下载一张 VNDB 封面 → 本地 NSFWJS 模型分类 → 打印 5 类概率。
 */
import https from "node:https"

// 独立运行时包（NODE_PATH 提供）
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tf = require("@tensorflow/tfjs")
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nsfwjs = require("nsfwjs")
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jpeg = require("jpeg-js")

const TEST_URL = process.env.TEST_IMAGE_URL || "https://t.vndb.org/cv/05/17005.jpg"

function download(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, { family: 4 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        download(res.headers.location).then(resolve, reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        res.destroy()
        return
      }
      const chunks: Buffer[] = []
      res.on("data", (c) => chunks.push(c))
      res.on("end", () => resolve(Buffer.concat(chunks)))
    }).on("error", reject)
  })
}

async function main() {
  console.log("tfjs backend:", tf.getBackend())
  const modelUrl = process.env.NSFW_MODEL_URL || undefined
  console.log("加载模型:", modelUrl ?? "默认 CDN (nsfwjs.com/model/)")
  const model = await nsfwjs.load(modelUrl, { size: 224 })
  console.log("模型加载成功")

  console.log("下载封面:", TEST_URL)
  const buf = await download(TEST_URL)
  console.log("封面大小:", buf.length, "bytes")

  const decoded = jpeg.decode(buf, { useTArray: true, maxMemoryUsageInMB: 512 })
  const { width, height, data } = decoded
  console.log(`解码: ${width}x${height} rgba=${data.length}`)

  // 构造 [h,w,3] RGB tensor（去掉 alpha）
  const rgb = new Uint8Array(width * height * 3)
  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    rgb[j] = data[i]
    rgb[j + 1] = data[i + 1]
    rgb[j + 2] = data[i + 2]
  }
  const tensor = tf.tensor3d(rgb, [height, width, 3])
  const preds = await model.classify(tensor)
  tensor.dispose()

  console.log("分类结果:")
  for (const p of preds) {
    console.log(`  ${p.className}: ${(p.probability * 100).toFixed(1)}%`)
  }
  const top = preds[0]
  console.log(`\nTOP: ${top.className} (${(top.probability * 100).toFixed(1)}%)`)

  // 映射建议
  let level = -1
  if (top.probability >= 0.9) {
    if (top.className === "Porn" || top.className === "Hentai") level = 2
    else if (top.className === "Sexy") level = 1
    else level = 0
  }
  console.log(`映射 coverSexual: ${level} (${level === -1 ? "低置信→待人工" : ["", "安全", "暗示", "露骨"][level + 1]})`)
  await tf.dispose()
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("FAIL:", e.message)
  process.exit(1)
})
