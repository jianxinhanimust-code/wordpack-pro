import { makeWord } from './books'
import type { BookMeta } from './books'
import type { Sense } from './types'
import type { Rarity } from '@/core/cardArt'

type Creature = {
  word: string; art: string; kind: string; rarity: Rarity; palette: number
  phonetic: string; sense: Sense; variant?: string; formOf?: string
}

const catalog = [
  { word: 'absorb', art: 'moss-otter', kind: '苔绒水獭', rarity: 'N', palette: 6, phonetic: '/əbˈzɔːb/',
    sense: ['v.', '吸收；吸纳；使全神贯注'] },
  { word: 'refract', art: 'prism-beetle', kind: '棱甲甲虫', rarity: 'R', palette: 1, phonetic: '/rɪˈfrækt/',
    sense: ['v.', '使（光线、声波等）折射'] },
  { word: 'amplify', art: 'crystal-stag', kind: '晶冠鹿', rarity: 'SR', palette: 3, phonetic: '/ˈæmplɪfaɪ/',
    sense: ['v.', '放大；增强；详述'] },
  { word: 'eclipse', art: 'eclipse-phoenix', kind: '蚀日凰', rarity: 'UR', palette: 5, phonetic: '/ɪˈklɪps/',
    sense: ['n.', '日食；月食'] },
  { word: 'crystallize', art: 'prism-beetle-crystal', kind: '棱甲甲虫', rarity: 'SR', palette: 5, phonetic: '/ˈkrɪstəlaɪz/',
    sense: ['v.', '结晶；使形成明确的形态'], variant: '晶化异种', formOf: 'refract' },
  { word: 'protect', art: 'dunes-armadillo', kind: '砂纹犰狳', rarity: 'N', palette: 2, phonetic: '/prəˈtekt/',
    sense: ['v.', '保护；防护'] },
  { word: 'endure', art: 'glacial-koi', kind: '霜棘锦鲤', rarity: 'R', palette: 4, phonetic: '/ɪnˈdjʊə/',
    sense: ['v.', '忍受；持续存在'] },
  { word: 'discharge', art: 'thunder-ray', kind: '雷鳐', rarity: 'SR', palette: 4, phonetic: '/dɪsˈtʃɑːdʒ/',
    sense: ['v.', '放电；释放；排出'] },
  { word: 'immense', art: 'abyss-leviathan', kind: '渊恒鲸', rarity: 'UR', palette: 1, phonetic: '/ɪˈmens/',
    sense: ['adj.', '巨大的；极广阔的'] },
  { word: 'vanish', art: 'glacial-koi-shadow', kind: '霜棘锦鲤', rarity: 'SR', palette: 7, phonetic: '/ˈvænɪʃ/',
    sense: ['v.', '消失；突然不见'], variant: '幽影异种', formOf: 'endure' },
  { word: 'observe', art: 'reed-crane', kind: '芦影鹭', rarity: 'N', palette: 8, phonetic: '/əbˈzɜːv/',
    sense: ['v.', '观察；察觉；遵守'] },
  { word: 'detect', art: 'storm-lynx', kind: '霆耳猞猁', rarity: 'R', palette: 4, phonetic: '/dɪˈtekt/',
    sense: ['v.', '探测；察觉；发现'] },
  { word: 'oscillate', art: 'tide-nautilus', kind: '涡庭鹦鹉螺', rarity: 'SR', palette: 1, phonetic: '/ˈɒsɪleɪt/',
    sense: ['v.', '振荡；来回摆动'] },
  { word: 'cling', art: 'tidal-crab', kind: '潮壳蟹', rarity: 'N', palette: 2, phonetic: '/klɪŋ/',
    sense: ['v.', '紧贴；抓牢；坚持'] },
  { word: 'conceal', art: 'obsidian-caiman', kind: '曜岩凯门鳄', rarity: 'R', palette: 9, phonetic: '/kənˈsiːl/',
    sense: ['v.', '隐藏；隐瞒；遮盖'] },
  { word: 'mimic', art: 'bloom-mantis', kind: '雾花螳', rarity: 'SR', palette: 3, phonetic: '/ˈmɪmɪk/',
    sense: ['v.', '模仿；模拟'] },
  { word: 'retain', art: 'amber-hedgehog', kind: '琥珀棘猬', rarity: 'N', palette: 5, phonetic: '/rɪˈteɪn/',
    sense: ['v.', '保留；保持；记住'] },
  { word: 'evade', art: 'mist-fox', kind: '岚尾狐', rarity: 'R', palette: 8, phonetic: '/ɪˈveɪd/',
    sense: ['v.', '躲避；逃脱；规避'] },
] as const satisfies readonly Creature[]

export type CreatureArt = typeof catalog[number]['art']
type CardCreature = Omit<Creature, 'art'> & { art: CreatureArt }
const byWord = new Map<string, CardCreature>(catalog.map(entry => [entry.word, entry]))

export const creatureBook = {
  id: 'creatures', name: '词灵系列', shortName: '词灵', description: '18 张生物词卡，含晶化与幽影异种。',
  color: 'violet', totalCount: catalog.length,
} as const satisfies BookMeta

export const creatureWords = catalog.map(entry => makeWord({
  word: entry.word, phonetic: entry.phonetic, definitions: [[...entry.sense]],
}, creatureBook.id))

export const creatureByWord = (key: string) => byWord.get(key)

export function alternateCreature(key: string) {
  const entry = byWord.get(key)
  return entry?.formOf ? byWord.get(entry.formOf) : [...byWord.values()].find(form => form.formOf === key)
}
