/**
 * 词库导入解析器测试
 */
import { describe, expect, it } from 'vitest'
import { parseWordlist, toCSV } from '@/core/import'
import { makeWord } from '@/data/books'

const BOOK = 'test'

function first(text: string) {
  const r = parseWordlist(text, BOOK)
  expect(r.words.length).toBeGreaterThan(0)
  return r.words[0]
}

describe('parseWordlist', () => {
  it('解析「词性.释义」格式', () => {
    const w = first('apple n. 苹果')
    expect(w.word).toBe('apple')
    expect(w.definitions).toEqual([['n.', '苹果']])
  })

  it('解析「词 [音标] 词性.释义」格式', () => {
    const w = first('banana [bəˈnɑːnə] n. 香蕉')
    expect(w.word).toBe('banana')
    expect(w.phonetic).toBe('/bəˈnɑːnə/')
    expect(w.definitions[0]).toEqual(['n.', '香蕉'])
  })

  it('解析半角逗号分隔', () => {
    const w = first('hello,你好')
    expect(w.word).toBe('hello')
    expect(w.definitions).toEqual([['', '你好']])
  })

  it('解析中文逗号分隔', () => {
    const w = first('world，世界')
    expect(w.word).toBe('world')
    expect(w.definitions).toEqual([['', '世界']])
  })

  it('解析单词+单空格+释义', () => {
    const w = first('machine 机器')
    expect(w.word).toBe('machine')
    expect(w.definitions).toEqual([['', '机器']])
  })

  it('解析单词+多空格+释义', () => {
    const w = first('apple   苹果')
    expect(w.word).toBe('apple')
    expect(w.definitions).toEqual([['', '苹果']])
  })

  it('解析竖线分隔（含音标列）', () => {
    const w = first('read | 阅读 | riːd')
    expect(w.word).toBe('read')
    expect(w.phonetic).toBe('/riːd/')
    expect(w.definitions).toEqual([['', '阅读']])
  })

  it('解析制表符分隔（Excel 粘贴）', () => {
    const w = first('apple\t苹果')
    expect(w.word).toBe('apple')
    expect(w.definitions).toEqual([['', '苹果']])
  })

  it('解析纯单词（无释义）', () => {
    const w = first('abandon')
    expect(w.word).toBe('abandon')
    expect(w.definitions).toEqual([])
  })

  it('支持含撇号和连字符的单词', () => {
    expect(first("don't 不用").word).toBe("don't")
    expect(first('well-known 众所周知的').word).toBe('well-known')
  })

  it('支持多词短语', () => {
    const w = first('ice cream n. 冰淇淋')
    expect(w.word).toBe('ice cream')
    expect(w.definitions).toEqual([['n.', '冰淇淋']])
  })

  it('拆分多个义项', () => {
    const w = first('good adj. 好的；良好的')
    expect(w.definitions.length).toBeGreaterThan(1)
    expect(w.definitions[0]).toEqual(['adj.', '好的'])
  })

  it('解析 JSON 格式', () => {
    const w = first('[{"word":"apple","mean":"苹果"}]')
    expect(w.word).toBe('apple')
    expect(w.definitions).toEqual([['', '苹果']])
  })

  it('解析 JSON 嵌套 definitions', () => {
    const w = first('[{"word":"apple","definitions":[["n.","苹果"],["v.","运行"]]}]')
    expect(w.definitions.length).toBe(2)
  })

  it('读取单条 JSON 对象并将词性归一化', () => {
    const w = first('{"term":"derive","definitions":[{"pos":"vt.","meaning":"推导"}]}')
    expect(w.definitions).toEqual([['v.', '推导']])
  })

  it('保留有效 JSON 记录并统计重复和不合规词条', () => {
    const result = parseWordlist(JSON.stringify([{
      word: 'Don’t', definitions: [['v.', '不要']], tip: { text: 'invalid metadata' },
    }, { word: "don't", mean: '不要' }, { word: 'javascript:<script>', mean: '无效' }]), BOOK)
    expect(result.words).toEqual([makeWord({ word: "Don't", definitions: [['v.', '不要']] }, BOOK)])
    expect(result.skipped).toBe(2)
  })

  it('根据 CSV 表头匹配列并处理多行及转义引号', () => {
    const csv = '\uFEFF释义,音标,单词\r\n"n. 人工\n智能，简称 ""AI""",/ˌɑːtɪˈfɪʃəl/,artificial intelligence'
    const result = parseWordlist(csv, BOOK)
    expect(result.words).toEqual([makeWord({
      word: 'artificial intelligence', phonetic: '/ˌɑːtɪˈfɪʃəl/', definitions: [['n.', '人工\n智能，简称 "AI"']],
    }, BOOK)])
    expect(result.skipped).toBe(0)
  })

  it('兼容没有表头的带引号两列 CSV', () => {
    const w = first('"adapt","v. 适应，调整"')
    expect(w.definitions).toEqual([['v.', '适应，调整']])
    expect(w.phonetic).toBe('')
  })

  it('丢弃 CSV 中引号未闭合的行', () => {
    const { words, skipped } = parseWordlist('word,meaning\nadapt,适应\nadopt,"采纳', BOOK)
    expect(words.map(w => w.word)).toEqual(['adapt'])
    expect(skipped).toBe(1)
  })

  it('去重', () => {
    const r = parseWordlist('apple 苹果\napple 苹果\nApple 苹果', BOOK)
    expect(r.words.length).toBe(1)
  })

  it('忽略空行和标题', () => {
    const r = parseWordlist('apple 苹果\n\n## 标题\n=====\nworld 世界', BOOK)
    expect(r.words.map((w) => w.word)).toEqual(['apple', 'world'])
  })

  it('拒绝无效行但保留有效行', () => {
    const r = parseWordlist('12345 数字\napple 苹果', BOOK)
    expect(r.words.length).toBe(1)
    expect(r.words[0].word).toBe('apple')
  })

  it('空输入返回空结果', () => {
    const r = parseWordlist('   ', BOOK)
    expect(r.words.length).toBe(0)
  })

  it('批量解析整份词表', () => {
    const r = parseWordlist('apple 苹果\nbanana 香蕉\nworld 世界', BOOK)
    expect(r.words.length).toBe(3)
    expect(r.words.map((w) => w.word)).toEqual(['apple', 'banana', 'world'])
  })
})

describe('toCSV', () => {
  it('导出为带表头的 CSV', () => {
    const words = [makeWord({ word: 'apple', definitions: [['n.', '苹果']] }, BOOK)]
    const csv = toCSV(words)
    expect(csv.split('\n')[0]).toBe('word,phonetic,meaning')
    expect(csv).toContain('apple')
    expect(csv).toContain('n.苹果')
  })

  it('CSV 可被自身解析器读回', () => {
    const words = [makeWord({ word: 'apple', phonetic: '/ˈæpl/', definitions: [['n.', '苹果']] }, BOOK)]
    const csv = toCSV(words)
    expect(parseWordlist(csv, BOOK).words).toEqual(words)
  })
})
