/**
 * 自定义词库解析：支持多种常见格式
 *
 *  支持的输入格式（每行一条）：
 *    word                 仅单词（无释义，可用于听写练习）
 *    word 释义
 *    word\t释义
 *    word,释义
 *    word [音标] 词性.释义
 *    word | 释义 | 音标
 *    word<TAB>释义<TAB>音标
 *    tab: word<TAB>释义   （Excel / CSV 两列）
 *
 *  另外支持整段 JSON（[{"word":"x","definitions":[["n.","释义"]]}] 或
 *  {"word":"x","mean":"释义"} 格式）。
 */
import type { PartOfSpeech, Sense } from '@/data/types'
import type { Word } from '@/data/books'
import { makeWord } from '@/data/books'

// 词性标记：长的排前面，避免 "adj." 被 "a" 抢先匹配
const POS_TOKENS = 'adj|adv|prep|conj|pron|num|art|int|vt|vi|aux|n|v|a|ad'
const HEADWORDS = ['word', 'headword', 'term', 'english', '单词', '英文', '词汇']
const MEANINGS = ['mean', 'meaning', 'definition', 'translation', 'chinese', 'cn', '释义', '翻译', '中文', '中文释义']
const PHONETICS = ['phonetic', 'phonetics', 'ipa', 'pronunciation', '音标']

export interface ParseResult {
  words: Word[]
  skipped: number
}

/** 解析纯文本词表 */
export function parseWordlist(text: string, book: string, fallbackFreq = 3): ParseResult {
  const trimmed = text.trim()
  if (!trimmed) return { words: [], skipped: 0 }

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return parseJson(trimmed, book, fallbackFreq)
  }

  const first = trimmed.split(/\r\n?|\n/, 1)[0]
  const delimiter = first.includes('\t') ? '\t' : ','
  const headers = readDelimited(first, delimiter).next().value
  if (headers) {
    const names = headers.map(header => header.toLowerCase())
    const word = names.findIndex(name => HEADWORDS.includes(name))
    const meaning = names.findIndex(name => MEANINGS.includes(name))
    const ipa = names.findIndex(name => PHONETICS.includes(name))
    if (word !== -1 && (meaning !== -1 || ipa !== -1)) {
      const rows = readDelimited(trimmed, delimiter)
      rows.next()
      return gather(Array.from(rows, row => row && createEntry(row[word], row[meaning], row[ipa], fallbackFreq, book)))
    }
  }

  return gather(trimmed.split(/\r\n?|\n/)
    .map(line => line.trim())
    .filter(line => line && !/^[=\-*\s]{3,}$/.test(line) && !line.startsWith('#'))
    .map(line => parseLine(line, book, fallbackFreq)))
}

function gather(entries: Iterable<Word | null>): ParseResult {
  const words: Word[] = []
  const seen = new Set<string>()
  let skipped = 0
  for (const word of entries) {
    const key = word?.word.toLowerCase()
    if (!word || !key || seen.has(key) || words.length >= 40000) {
      skipped += 1
      continue
    }
    seen.add(key)
    words.push(word)
  }
  return { words, skipped }
}

/** 引号内的分隔符、换行和双引号属于字段内容。 */
function* readDelimited(text: string, delimiter: string): Generator<string[] | null, void> {
  let fields: string[] = []
  let field = ''
  let quoted = false
  let closed = false
  let malformed = false
  const normalized = text.replace(/\r\n?/g, '\n') + '\n'
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index]
    if (quoted) {
      if (char !== '"') field += char
      else if (normalized[index + 1] === '"') {
        field += '"'
        index += 1
      } else {
        quoted = false
        closed = true
      }
      continue
    }
    if (char === '\n' || char === delimiter) {
      fields.push(field.trim())
      field = ''
      closed = false
      if (char === '\n') {
        if (fields.length > 1 || fields[0]) yield malformed ? null : fields
        fields = []
        malformed = false
      }
    } else if (closed) {
      if (!/\s/.test(char)) malformed = true
    } else if (char === '"' && !field.trim()) {
      field = ''
      quoted = true
    } else {
      field += char
    }
  }
  if (quoted) yield null
}

function headword(input: string) {
  return input.normalize('NFKC').trim().replace(/[’‘]/g, "'").replace(/\s+/g, ' ')
}

function isWord(word: string) {
  return /^[A-Za-z][A-Za-z0-9_ .'/-]{0,159}$/.test(headword(word))
}

/** 解析单行 */
function parseLine(line: string, book: string, freq: number): Word | null {
  if (/^"|,\s*"/.test(line)) {
    const fields = readDelimited(line, ',').next().value
    if (!fields) return null
    const [word, second, third] = fields
    return fields.length <= 2
      ? createEntry(word, second, undefined, freq, book)
      : createEntry(word, third, second, freq, book)
  }

  // 整行必须以英文字母开头，否则不是单词表
  if (!/^[A-Za-z]/.test(line)) return null

  // 1) 管道分隔: word | 释义 | 音标
  if (line.includes('|')) {
    const parts = line.split('|').map((s) => s.trim())
    const [word, mean, ipa] = parts
    if (isWord(word)) {
      return createEntry(word, mean, ipa, freq, book)
    }
    return null
  }

  // 2) 方括号音标: word [ipa] 词性.释义
  const bracket = line.match(/^([A-Za-z][A-Za-z'\- ]*?)\s*\[([^\]]+)\]\s*(.*)$/)
  if (bracket) {
    const [, word, ipa, rest] = bracket
    return createEntry(word, rest, ipa, freq, book)
  }

  // 3) 制表符: word<TAB>释义 或 word<TAB>释义<TAB>音标
  if (line.includes('\t')) {
    const parts = line.split('\t').map((s) => s.trim())
    const [word, mean, ipa] = parts
    if (isWord(word)) return createEntry(word, mean, ipa, freq, book)
    // 也可能是 释义<TAB>单词
    if (parts.length >= 2 && isWord(parts[1])) {
      return createEntry(parts[1], parts[0], undefined, freq, book)
    }
    return null
  }

  // 4) 逗号分隔: word,释义  （释义里可能有逗号，取第一个逗号）
  const comma = line.indexOf(',')
  const cnComma = line.indexOf('，')
  const idx = comma >= 0 ? comma : cnComma
  if (idx > 0) {
    const word = line.slice(0, idx).trim()
    const mean = line.slice(idx + 1).trim()
    if (isWord(word) && mean) return createEntry(word, mean, undefined, freq, book)
  }

  // 5) 多空格分隔: word   释义（词本身可能含空格，贪婪匹配整段）
  const multi = line.match(/^([A-Za-z][A-Za-z'\-]*(?: [A-Za-z'\-]+)*?)\s{2,}(\S.*)$/)
  if (multi) {
    const [, word, mean] = multi
    if (isWord(word)) return createEntry(word, mean, undefined, freq, book)
  }

  // 6) 单空格 + 带词性标记的释义: "good adj. 好的" / "ice cream n. 冰淇淋"
  //    词性标记按长的优先匹配（adj 在 a 之前），避免 "adj." 被拆成 "a" + "dj."
  const single = line.match(
    /^([A-Za-z][A-Za-z'\-]*(?: [A-Za-z'\-]+)*?)\s+((?:adj|adv|prep|conj|pron|num|art|int|vt|vi|aux|n|v|a|ad)\.\s*\S.*)$/i,
  )
  if (single) {
    const [, word, mean] = single
    if (isWord(word)) return createEntry(word, mean, undefined, freq, book)
  }

  // 7) 单空格 + 中文释义（无词性标记）: world 世界
  const cnSingle = line.match(/^([A-Za-z][A-Za-z'\-]*(?: [A-Za-z'\-]+)*?)\s+([\u4e00-\u9fff].*)$/)
  if (cnSingle) {
    const [, word, mean] = cnSingle
    if (isWord(word)) return createEntry(word, mean, undefined, freq, book)
  }

  // 8) 单空格 + 英文释义: abandon give up
  const enSingle = line.match(/^([A-Za-z][A-Za-z'\-]+)\s+([a-z][A-Za-z\s,.'-]*)$/)
  if (enSingle) {
    const [, word, mean] = enSingle
    if (isWord(word) && mean.length >= 3) {
      return createEntry(word, mean, undefined, freq, book)
    }
  }

  // 9) 纯单词
  return createEntry(line, undefined, undefined, freq, book)
}

function createEntry(word: string | undefined, mean: string | undefined, ipa: string | undefined, freq: number, book: string): Word | null {
  if (!word || !isWord(word)) return null
  const definitions = parseSenses(mean ?? '')
  const cleanedIpa = ipa ? ipa.trim().replace(/^\/|\/$/g, '') : ''
  if (cleanedIpa.length > 198 || definitions.some(([, gloss]) => gloss.length > 2000)) return null
  return makeWord(
    {
      word: headword(word),
      phonetic: cleanedIpa ? `/${cleanedIpa}/` : '',
      freq,
      definitions,
    },
    book,
  )
}

/** 从混合文本里提取词性与释义 */
function parseSenses(raw: string): Sense[] {
  if (!raw) return []
  const text = raw.trim()

  // 找到所有词性标记的位置："n. 能力" 或 "vt. 放弃 n. 放任"
  const matches = [...text.matchAll(new RegExp(`(?:^|[\\s\\uff1b;,])\\**(${POS_TOKENS})\\.\\s*`, 'gi'))]
  if (matches.length === 0) {
    // 无词性标记：按分号/逗号切分义项
    const parts = text
      .split(/[；;]/)
      .map((s) => s.trim())
      .filter(Boolean)
    // 没有分号时再按逗号切，最多 3 条
    const chunks = parts.length > 1 ? parts : text.split(/[，,]/).map((s) => s.trim()).filter(Boolean)
    return chunks.slice(0, 3).map((p) => ['', p] as Sense)
  }

  const out: Sense[] = []
  for (let i = 0; i < matches.length; i++) {
    const pos = normPos(matches[i][1])
    const start = (matches[i].index ?? 0) + matches[i][0].length
    const end = i + 1 < matches.length ? matches[i + 1].index ?? text.length : text.length
    const body = text.slice(start, end).trim()
    if (!body) continue

    // 同一词性下的多义项（用分号分隔）拆成多条
    const parts = body
      .split(/[；;]/)
      .map((s) => s.trim())
      .filter(Boolean)
    for (const p of parts) out.push([pos, p])
  }
  return out.slice(0, 4)
}

function normPos(tok: string): PartOfSpeech | '' {
  const map: Record<string, PartOfSpeech> = {
    art: 'art.', n: 'n.', v: 'v.', vt: 'v.', vi: 'v.', a: 'adj.', adj: 'adj.',
    ad: 'adv.', adv: 'adv.', prep: 'prep.', conj: 'conj.', pron: 'pron.', num: 'num.', int: 'int.',
  }
  const key = tok.trim().toLowerCase().replace(/\.$/, '')
  return Object.hasOwn(map, key) ? map[key] : ''
}

/** 解析 JSON 词表 */
function parseJson(text: string, book: string, freq: number): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { words: [], skipped: 1 }
  }
  const records: unknown[] = Array.isArray(data) ? data
    : data && typeof data === 'object' && 'words' in data && Array.isArray(data.words) ? data.words : [data]
  return gather(records.map(item => parseJsonEntry(item, book, freq)))
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function jsonSense(value: unknown): Sense | null {
  const record = value as Record<string, unknown> | null
  const [pos, gloss] = Array.isArray(value) ? value
    : [record?.pos ?? record?.partOfSpeech, record?.cn ?? record?.meaning ?? record?.definition]
  const text = asText(gloss)
  return text ? [normPos(asText(pos)), text] : null
}

function parseJsonEntry(item: unknown, book: string, freq: number): Word | null {
  if (typeof item === 'string') return parseLine(item, book, freq)
  if (!item || typeof item !== 'object') return null
  const record = item as Record<string, unknown>
  const word = asText(record.word ?? record.w ?? record.headword ?? record.term)
  if (!isWord(word)) return null

  const rawSenses = record.definitions ?? record.d
  const mean = record.mean ?? record.meaning ?? record.cn ?? record.translation ?? record.trans ?? record.definition
  const senses = Array.isArray(rawSenses) ? rawSenses.map(jsonSense).filter(s => s !== null) : []
  const definitions: Sense[] = senses.length ? senses
    : Array.isArray(mean) ? mean.map(asText).filter(Boolean).map(value => ['', value])
      : parseSenses(asText(mean))
  const ipa = asText(record.phonetic ?? record.ipa ?? record.phonetics ?? record.p).replace(/^\/|\/$/g, '')
  const rawFrequency = record.freq ?? record.frequency ?? record.f
  const frequency = typeof rawFrequency === 'number' || typeof rawFrequency === 'string' ? Number(rawFrequency) : freq
  const tip = asText(record.tip ?? record.note ?? record.y)
  if (definitions.length > 40 || ipa.length > 198 || tip.length > 2000
    || definitions.some(([, gloss]) => gloss.length > 2000)) return null

  return makeWord({
    word: headword(word),
    phonetic: ipa ? `/${ipa}/` : '',
    freq: Number.isFinite(frequency) ? frequency : freq,
    definitions,
    tip: tip || undefined,
  }, book)
}

/** 导出为 CSV（用于备份/分享） */
export function toCSV(words: Word[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
  const rows = words.map((w) =>
    [
      esc(w.word),
      esc(w.phonetic.replace(/^\/|\/$/g, '')),
      esc(w.definitions.map(([pos, cn]) => `${pos}${cn}`).join('; ')),
    ].join(','),
  )
  return ['word,phonetic,meaning', ...rows].join('\n')
}
