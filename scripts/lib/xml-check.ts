/**
 * 轻量 XML 良构性校验：只检查标签是否正确配对。
 *
 * 存在的理由：改写 xlsx 内部 XML 时，正则替换很容易多留或少留一个结束标签。
 * SheetJS 读这类文件比较宽容、不会报错，但 Excel 会直接判定文件损坏并弹出修复提示，
 * 光靠「能不能读出来」根本发现不了。所以这里做一次标签配对检查兜底。
 */

export interface XmlIssue {
  message: string
  /** 出错字符在整个文本中的偏移 */
  offset: number
  /** 便于定位的第几行第几列 */
  line: number
  column: number
}

function positionOf(text: string, offset: number): { line: number; column: number } {
  let line = 1
  let lastBreak = -1
  for (let i = 0; i < offset; i++) {
    if (text.charCodeAt(i) === 10) {
      line++
      lastBreak = i
    }
  }
  return { line, column: offset - lastBreak }
}

/** 扫描标签，返回第一个配对错误；完全良构则返回 null */
export function checkXmlWellFormed(xml: string): XmlIssue | null {
  const stack: { name: string; offset: number }[] = []
  let i = 0
  const n = xml.length

  while (i < n) {
    const lt = xml.indexOf("<", i)
    if (lt < 0) break

    // 注释 <!-- -->
    if (xml.startsWith("<!--", lt)) {
      const end = xml.indexOf("-->", lt + 4)
      if (end < 0) {
        return { message: "注释未闭合", offset: lt, ...positionOf(xml, lt) }
      }
      i = end + 3
      continue
    }
    // CDATA
    if (xml.startsWith("<![CDATA[", lt)) {
      const end = xml.indexOf("]]>", lt + 9)
      if (end < 0) {
        return { message: "CDATA 未闭合", offset: lt, ...positionOf(xml, lt) }
      }
      i = end + 3
      continue
    }
    // 处理指令 / XML 声明 <? ... ?>
    if (xml.startsWith("<?", lt)) {
      const end = xml.indexOf("?>", lt + 2)
      if (end < 0) {
        return { message: "处理指令未闭合", offset: lt, ...positionOf(xml, lt) }
      }
      i = end + 2
      continue
    }
    // DOCTYPE 等声明 <!...>
    if (xml.startsWith("<!", lt)) {
      const end = xml.indexOf(">", lt)
      if (end < 0) {
        return { message: "声明未闭合", offset: lt, ...positionOf(xml, lt) }
      }
      i = end + 1
      continue
    }

    // 找到标签结束的 '>'，跳过引号里的内容
    let p = lt + 1
    let quote = 0
    while (p < n) {
      const c = xml.charCodeAt(p)
      if (quote) {
        if (c === quote) quote = 0
      } else if (c === 34 || c === 39) {
        quote = c
      } else if (c === 62) {
        break
      }
      p++
    }
    if (p >= n) {
      return { message: "标签未闭合", offset: lt, ...positionOf(xml, lt) }
    }

    const raw = xml.slice(lt + 1, p)
    const isEnd = raw.startsWith("/")
    const isSelfClose = raw.endsWith("/")
    const name = (isEnd ? raw.slice(1) : isSelfClose ? raw.slice(0, -1) : raw)
      .split(/[\s\/]/)[0]
      .trim()

    if (!name) {
      return { message: "空标签名", offset: lt, ...positionOf(xml, lt) }
    }

    if (isEnd) {
      const top = stack.pop()
      if (!top) {
        return {
          message: `多余的结束标签 </${name}>`,
          offset: lt,
          ...positionOf(xml, lt),
        }
      }
      if (top.name !== name) {
        return {
          message: `结束标签 </${name}> 与开始标签 <${top.name}> 不匹配`,
          offset: lt,
          ...positionOf(xml, lt),
        }
      }
    } else if (!isSelfClose) {
      stack.push({ name, offset: lt })
    }

    i = p + 1
  }

  if (stack.length) {
    const top = stack[stack.length - 1]
    return {
      message: `开始标签 <${top.name}> 没有对应的结束标签`,
      offset: top.offset,
      ...positionOf(xml, top.offset),
    }
  }

  return null
}
