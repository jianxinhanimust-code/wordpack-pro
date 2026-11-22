import type { Word } from './books'
import { wordKey } from '@/core/schema'

type Note = {
  meaning: string; collocations: string[]; example: string; translation: string;
  us?: string; uk?: string; root?: string
}
function note(meaning: string, collocations: string, example: string, translation: string, uk?: string, us?: string, root?: string): Note {
  return { meaning, collocations: collocations.split(' / '), example, translation, us, uk, root }
}

// Original usage examples written for this app. These examples do not come from past exams.
export const notes: Record<string, Note> = {
  sustain: note('维持；持续支撑', 'sustain growth / sustain interest / sustain an injury', 'The city needs more clean energy to sustain its growth.', '这座城市需要更多清洁能源来维持增长。', 'səˈsteɪn', 'səˈsteɪn'),
  derive: note('源自；从……获得', 'derive from / derive a benefit / derive meaning from context', 'The new estimate is derived from interviews with local residents.', '这项新估算来自对当地居民的访谈。', 'dɪˈraɪv', 'dɪˈraɪv'),
  allocate: note('分配；划拨', 'allocate resources / allocate funds / allocate time to a task', 'The school allocated extra time to independent reading.', '学校安排了额外时间供学生自主阅读。', 'ˈæləkeɪt', 'ˈæləkeɪt'),
  adapt: note('适应；改编', 'adapt to change / adapt a novel / adapt for a new audience', 'Small firms must adapt quickly to changing demand.', '小企业必须迅速适应需求变化。', 'əˈdæpt', 'əˈdæpt'),
  adopt: note('采纳；收养', 'adopt a policy / adopt a method / adopt a child', 'Several towns have adopted the same recycling policy.', '几个城镇已经采纳了同样的回收政策。', 'əˈdɒpt', 'əˈdɑːpt'),
  retain: note('保留；保持', 'retain information / retain control / retain heat', 'Taking notes helped participants retain more information.', '记笔记帮助参与者记住了更多信息。'),
  maintain: note('维持；保养；坚持认为', 'maintain a balance / maintain equipment / maintain standards', 'Regular inspections help maintain the equipment.', '定期检查有助于保养设备。'),
  inspect: note('检查；仔细察看', 'inspect a building / inspect the goods / inspect for damage', 'Engineers inspected the bridge after the storm.', '暴风雨过后，工程师检查了这座桥。', 'ɪnˈspekt', 'ɪnˈspekt', '来自与拉丁语 specere「看」有关的 inspicere。'),
  respect: note('尊重；方面', 'respect privacy / mutual respect / in this respect', 'Researchers must respect the privacy of participants.', '研究者必须尊重参与者的隐私。', undefined, undefined, '借自与拉丁语 respicere「回看、顾及」有关的形式。'),
  prospect: note('前景；可能性', 'job prospects / the prospect of change / future prospects', 'Better transport improved the town’s economic prospects.', '更好的交通改善了这个城镇的经济前景。', undefined, undefined, '来自拉丁语 prospectus，与 prospicere「向前看」相关。'),
  spectator: note('观众；旁观者', 'sports spectators / a crowd of spectators / a spectator sport', 'Spectators watched from a safe distance.', '观众在安全距离外观看。', undefined, undefined, '来自拉丁语 spectator「观看者」，与 spectare「观看」相关。'),
  coherent: note('连贯的；条理清楚的', 'a coherent argument / a coherent strategy / a coherent account', 'The report presents a coherent explanation of the decline.', '报告对这一衰退作出了连贯清晰的解释。'),
  subtle: note('细微的；不易察觉的', 'a subtle difference / a subtle change / a subtle shift', 'The researchers noticed a subtle shift in public attitudes.', '研究者发现公众态度出现了细微的转变。'),
  convey: note('传达；运送', 'convey a message / convey meaning / convey concern', 'The diagram conveys the main idea more clearly.', '这张图更清楚地传达了主要观点。'),
  evident: note('明显的；显而易见的', 'become evident / evident from the data / immediately evident', 'The gap was evident from the first set of results.', '从第一组结果就可以明显看出差距。'),
  obscure: note('不知名的；遮蔽；使难以理解', 'an obscure reference / obscure the view / obscure the issue', 'Technical language can obscure a simple point.', '技术术语可能会让一个简单的观点变得难懂。'),
  enhance: note('增强；提升', 'enhance performance / enhance understanding / enhance safety', 'Short breaks can enhance concentration during long tasks.', '短暂休息能够提高人在长时间任务中的专注度。'),
  diminish: note('减少；减弱', 'diminish over time / diminish the effect / diminish in value', 'The benefits diminished when the program lost funding.', '项目失去资助后，效果逐渐减弱。'),
  constrain: note('限制；约束', 'constrain growth / be constrained by / financial constraints', 'Limited storage space constrained the design.', '有限的储存空间限制了设计。'),
  acquire: note('获得；习得', 'acquire skills / acquire knowledge / acquire a company', 'Children acquire vocabulary through repeated exposure.', '儿童通过反复接触习得词汇。'),
  coincide: note('同时发生；相吻合', 'coincide with / coincide in time / views coincide', 'The drop in sales coincided with a rise in prices.', '销量下降与价格上涨同时发生。'),
  accessible: note('可进入的；易获得的；易理解的', 'accessible to the public / an accessible design / accessible language', 'The library made its archives accessible online.', '图书馆将档案开放给公众在线查阅。'),
  assessment: note('评估；评价', 'risk assessment / initial assessment / make an assessment', 'The committee requested an independent assessment of the project.', '委员会要求对项目进行独立评估。'),
  assumption: note('假设；假定', 'make an assumption / challenge an assumption / basic assumption', 'The forecast rests on the assumption that demand will rise.', '这项预测以需求会上升的假设为基础。'),
  contrast: note('对照；差异', 'in contrast to / a sharp contrast / contrast with', 'In contrast to the first survey, the follow-up included rural residents.', '与第一次调查不同，后续调查纳入了农村居民。'),
  consequence: note('后果；结果', 'a direct consequence / serious consequences / as a consequence', 'The delay was a direct consequence of staff shortages.', '延误是人员短缺的直接后果。'),
  significant: note('显著的；重要的', 'a significant change / a significant difference / statistically significant', 'The researchers found a significant difference between the groups.', '研究人员发现两组之间存在显著差异。'),
  consistent: note('一致的；始终如一的', 'consistent with / consistent results / a consistent approach', 'The latest results are consistent with earlier studies.', '最新结果与早期研究一致。'),
  establish: note('建立；证实', 'establish a link / establish a system / establish whether', 'The survey did not establish a link between the two factors.', '调查未能证实这两个因素之间存在联系。'),
  highlight: note('突出；强调', 'highlight a problem / highlight differences / key highlights', 'The case highlights the need for clearer instructions.', '这个案例突显了提供更清晰说明的必要性。'),
  interpret: note('解释；理解；口译', 'interpret the results / interpret a text / interpret as', 'The same image can be interpreted in several ways.', '同一张图片可以有多种解读。'),
  relevant: note('相关的；切题的', 'relevant to / relevant evidence / relevant information', 'Only data relevant to the question were included.', '只纳入了与研究问题有关的数据。'),
  implication: note('可能的影响；隐含意义', 'practical implications / wider implications / an implication for policy', 'The findings have implications for urban planning.', '这些发现对城市规划有潜在影响。'),
}

export const priority = Object.keys(notes)
export type RelationKind = '词源' | '近义' | '反义' | '易混'
export interface Relation {
  a: string; b: string; kind: RelationKind; label: string; source: string
}
export const relations: Relation[] = [
  { a: 'inspect', b: 'spectator', kind: '词源', label: '同属拉丁语「看」词族，分别强调检查和观看。', source: 'https://www.etymonline.com/word/spectator' },
  { a: 'inspect', b: 'respect', kind: '词源', label: '两词的拉丁语前身都与「看」有关，respect 经「回看、顾及」发展为尊重。', source: 'https://www.etymonline.com/word/respect' },
  { a: 'inspect', b: 'prospect', kind: '词源', label: '同属「看」词族。prospect 从「向前看」发展出前景、可能性。', source: 'https://www.etymonline.com/word/prospect' },
  { a: 'sustain', b: 'maintain', kind: '近义', label: '在「使继续」义有重合。sustain 常说增长、兴趣，maintain 也常说保养设备。', source: 'https://www.oxfordlearnersdictionaries.com/definition/english/sustain' },
  { a: 'enhance', b: 'diminish', kind: '反义', label: '谈及影响或效力时，enhance 是增强，diminish 是减弱。', source: 'https://www.merriam-webster.com/thesaurus/diminish' },
  { a: 'adapt', b: 'adopt', kind: '易混', label: 'adapt 是调整以适应或改编，adopt 是采纳一种做法或收养。', source: 'https://dictionary.cambridge.org/dictionary/english/adapt' },
  { a: 'evident', b: 'obscure', kind: '反义', label: '形容信息清晰程度时，evident 是明显，obscure 是晦涩难懂。', source: 'https://www.merriam-webster.com/thesaurus/obscure' },
]

export const related = (word: string) => relations.filter(r => r.a === wordKey(word) || r.b === wordKey(word))
export const other = (r: Relation, word: string) => r.a === wordKey(word) ? r.b : r.a
export function getNote(word: string): Note | undefined {
  const key = wordKey(word)
  return Object.hasOwn(notes, key) ? notes[key] : undefined
}

export function meaningOf(word: Word) {
  return word.definitions.map(([, cn]) => cn).slice(0, 2).join('；') || getNote(word.word)?.meaning || ''
}

export function orderByEditorial(words: Word[]) {
  const ranks = new Map(priority.map((id, index) => [id, index]))
  return [...words].sort((a, b) =>
    (ranks.get(wordKey(a.word)) ?? Infinity) - (ranks.get(wordKey(b.word)) ?? Infinity))
}

