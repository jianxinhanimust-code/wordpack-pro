import { makeWord } from './books'
import type { BookMeta } from './books'
import type { Sense } from './types'
import type { Rarity } from '@/core/cardArt'

type Creature = {
  word: string; art: string; kind: string; rarity: Rarity; palette: number
  phonetic: string; sense: Sense; variant?: string; formOf?: string
}

const creatures = [
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

const exotic = [
  { word: 'adhere', art: 'salt-gecko', kind: '盐滩壁虎', rarity: 'N', palette: 2, phonetic: '/ədˈhɪə/',
    sense: ['v.', '黏附；坚持遵守'] },
  { word: 'transparent', art: 'glass-octopus', kind: '透幕玻璃章鱼', rarity: 'R', palette: 1, phonetic: '/trænˈspærənt/',
    sense: ['adj.', '透明的；明白易懂的'] },
  { word: 'stride', art: 'iron-root-secretarybird', kind: '铁根蛇鹫', rarity: 'SR', palette: 5, phonetic: '/straɪd/',
    sense: ['v.', '大步走；阔步前进'] },
  { word: 'colossal', art: 'canyon-tortoise', kind: '层岩陆龟', rarity: 'UR', palette: 2, phonetic: '/kəˈlɒsəl/',
    sense: ['adj.', '巨大的；庞大的'] },
  { word: 'radiate', art: 'salt-gecko-obsidian', kind: '盐滩壁虎', rarity: 'SR', palette: 9, phonetic: '/ˈreɪdieɪt/',
    sense: ['v.', '辐射；散发（光、热等）'], variant: '曜岩异种', formOf: 'adhere' },
  { word: 'transport', art: 'leafcutter-ant', kind: '翡翠切叶蚁', rarity: 'N', palette: 6, phonetic: '/trænˈspɔːt/',
    sense: ['v.', '运输；运送'] },
  { word: 'vault', art: 'dusk-jerboa', kind: '沙跃跳鼠', rarity: 'R', palette: 5, phonetic: '/vɔːlt/',
    sense: ['v.', '跳过；跃过'] },
  { word: 'pounce', art: 'fern-jumping-spider', kind: '蕨冠蛛', rarity: 'SR', palette: 6, phonetic: '/paʊns/',
    sense: ['v.', '突然扑向；猛扑'] },
  { word: 'luminous', art: 'aurora-siphonophore', kind: '极光栉水螅', rarity: 'UR', palette: 1, phonetic: '/ˈluːmɪnəs/',
    sense: ['adj.', '发光的；明亮的'] },
  { word: 'pulse', art: 'tide-bell-jellyfish', kind: '雾潮钟母', rarity: 'SR', palette: 3, phonetic: '/pʌls/',
    sense: ['v.', '有节奏地跳动；脉动'] },
  { word: 'perch', art: 'mangrove-frog', kind: '潮根树蛙', rarity: 'N', palette: 2, phonetic: '/pɜːtʃ/',
    sense: ['v.', '栖息；停在高处'] },
  { word: 'suspend', art: 'lantern-bat', kind: '灯索果蝠', rarity: 'R', palette: 6, phonetic: '/səˈspend/',
    sense: ['v.', '悬挂；暂停'] },
  { word: 'store', art: 'winter-pika', kind: '雪砾鼠兔', rarity: 'N', palette: 8, phonetic: '/stɔː/',
    sense: ['v.', '储藏；储存'] },
  { word: 'forage', art: 'rain-tapir', kind: '雨纹貘', rarity: 'R', palette: 9, phonetic: '/ˈfɒrɪdʒ/',
    sense: ['v.', '觅食；搜寻'] },
  { word: 'gather', art: 'cotton-bumblebee', kind: '棉绒熊蜂', rarity: 'N', palette: 5, phonetic: '/ˈɡæðə/',
    sense: ['v.', '收集；聚集'] },
  { word: 'drift', art: 'comb-sea-angel', kind: '流苏海天使', rarity: 'R', palette: 8, phonetic: '/drɪft/',
    sense: ['v.', '漂流；缓慢移动'] },
] as const satisfies readonly Creature[]

const variety = [
  { word: 'dive', art: 'pebble-puffin', kind: '卵石海鹦', rarity: 'N', palette: 8, phonetic: '/daɪv/',
    sense: ['v.', '潜入水中；俯冲'] },
  { word: 'vibrate', art: 'glasswing-cicada', kind: '琉璃翼蝉', rarity: 'R', palette: 5, phonetic: '/vaɪˈbreɪt/',
    sense: ['v.', '振动；颤动'] },
  { word: 'soar', art: 'ash-condor', kind: '灰烬神鹫', rarity: 'SR', palette: 9, phonetic: '/sɔː/',
    sense: ['v.', '翱翔；迅速上升'] },
  { word: 'shelter', art: 'canopy-sloth', kind: '古冠树懒', rarity: 'UR', palette: 6, phonetic: '/ˈʃeltə/',
    sense: ['n.', '遮蔽物；庇护所'] },
  { word: 'frost', art: 'glasswing-cicada-frost', kind: '琉璃翼蝉', rarity: 'SR', palette: 4, phonetic: '/frɒst/',
    sense: ['n.', '霜；霜冻'], variant: '霜化异种', formOf: 'vibrate' },
  { word: 'shield', art: 'cinder-pangolin', kind: '烬甲穿山甲', rarity: 'N', palette: 2, phonetic: '/ʃiːld/',
    sense: ['n.', '盾；防护物'] },
  { word: 'scent', art: 'sand-ray-hound', kind: '沙帆猎犬', rarity: 'R', palette: 2, phonetic: '/sent/',
    sense: ['n.', '气味；气味留下的踪迹'] },
  { word: 'camouflage', art: 'kelp-seadragon', kind: '海藻叶海龙', rarity: 'SR', palette: 1, phonetic: '/ˈkæməflɑːʒ/',
    sense: ['v.', '伪装；掩饰'] },
  { word: 'pierce', art: 'glacier-narwhal', kind: '冰川独角鲸', rarity: 'UR', palette: 4, phonetic: '/pɪəs/',
    sense: ['v.', '刺穿；穿透'] },
  { word: 'segment', art: 'amber-centipede', kind: '琥珀蜈蚣', rarity: 'SR', palette: 5, phonetic: '/ˈseɡmənt/',
    sense: ['n.', '部分；段；节'] },
  { word: 'disguise', art: 'dew-chameleon', kind: '晨露变色龙', rarity: 'N', palette: 6, phonetic: '/dɪsˈɡaɪz/',
    sense: ['v.', '伪装；掩饰身份或外貌'] },
  { word: 'rigid', art: 'coral-boxfish', kind: '珊瑚箱鲀', rarity: 'R', palette: 4, phonetic: '/ˈrɪdʒɪd/',
    sense: ['adj.', '坚硬的；僵硬的；不易改变的'] },
  { word: 'velvet', art: 'velvet-moth', kind: '绒尾蛾', rarity: 'N', palette: 3, phonetic: '/ˈvelvɪt/',
    sense: ['n.', '天鹅绒；丝绒'] },
  { word: 'silent', art: 'peat-owl', kind: '泥炭林鸮', rarity: 'R', palette: 8, phonetic: '/ˈsaɪlənt/',
    sense: ['adj.', '无声的；沉默的'] },
  { word: 'regenerate', art: 'moss-salamander', kind: '苔溪蝾螈', rarity: 'N', palette: 6, phonetic: '/rɪˈdʒenəreɪt/',
    sense: ['v.', '再生；使恢复活力'] },
  { word: 'grip', art: 'iron-stag-beetle', kind: '铁角锹甲', rarity: 'R', palette: 7, phonetic: '/ɡrɪp/',
    sense: ['v.', '抓紧；握牢'] },
] as const satisfies readonly Creature[]

export type CreatureArt = typeof creatures[number]['art'] | typeof exotic[number]['art'] | typeof variety[number]['art']
export type ArtBookId = 'creatures' | 'exotic' | 'variety'
type CardCreature = Omit<Creature, 'art'> & { art: CreatureArt; series: ArtBookId }

function edition<const Id extends ArtBookId>(meta: Omit<BookMeta, 'id' | 'totalCount'> & { id: Id },
  cards: readonly Creature[], cover: CreatureArt, previews: string[], packName: string) {
  const words = cards.map(card => makeWord({
    word: card.word, phonetic: card.phonetic, definitions: [[...card.sense]],
  }, meta.id))
  return { meta: { ...meta, totalCount: cards.length }, cover, words, packName, previews: words.filter(word => previews.includes(word.word)) }
}

export const artBooks = [
  edition({ id: 'creatures', name: '词灵系列', shortName: '词灵', description: '18 张生物词卡，含晶化与幽影异种。', color: 'violet' },
    creatures, 'eclipse-phoenix', ['absorb', 'eclipse', 'crystallize'], '词灵词包'),
  edition({ id: 'exotic', name: '异境物种', shortName: '异境', description: '16 张生物词卡，含曜岩异种。', color: 'emerald' },
    exotic, 'canyon-tortoise', ['adhere', 'transparent', 'colossal'], '异境物种词包'),
  edition({ id: 'variety', name: '万象生灵', shortName: '万象', description: '16 张生物词卡，含霜化异种和两张传说。', color: 'blue' },
    variety, 'glacier-narwhal', ['dive', 'frost', 'pierce'], '万象生灵词包'),
] as const

const byWord = new Map<string, CardCreature>([
  ...creatures.map(entry => [entry.word, { ...entry, series: 'creatures' }] as const),
  ...exotic.map(entry => [entry.word, { ...entry, series: 'exotic' }] as const),
  ...variety.map(entry => [entry.word, { ...entry, series: 'variety' }] as const),
])
export const creatureWords = artBooks[0].words
export const artBook = (id: string | undefined) => artBooks.find(book => book.meta.id === id)

export const creatureByWord = (key: string) => byWord.get(key)

export function alternateCreature(key: string) {
  const entry = byWord.get(key)
  return entry?.formOf ? byWord.get(entry.formOf) : [...byWord.values()].find(form => form.formOf === key)
}
