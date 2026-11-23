import { describe, expect, it } from 'vitest'
import { cardDesign, motifs } from './cardArt'
import { alternateCreature, artBooks, creatureWords } from '@/data/creatures'

describe('word card artwork', () => {
  it('maps canonical spellings to the same artwork and uses one concealed design', () => {
    expect(cardDesign(' SUSTAIN ')).toEqual(cardDesign('sustain'))
    expect(cardDesign('Learner’s Guide')).toEqual(cardDesign("learner's guide"))
    expect(cardDesign('adapt', true)).toEqual(cardDesign('adopt', true))
    expect(cardDesign('adapt', true).identity).toBeNull()
  })

  it('gives the opening five cards different silhouettes and palettes', () => {
    const cards = ['sustain', 'derive', 'allocate', 'adapt', 'adopt'].map(word => cardDesign(word))
    expect(new Set(cards.map(card => card.motif)).size).toBe(5)
    expect(new Set(cards.map(card => card.palette.light)).size).toBe(5)
  })

  it('distributes ordinary terms across the full catalog with stable fingerprints', () => {
    const cards = Array.from({ length: 240 }, (_, index) => cardDesign('term ' + index))
    expect(new Set(cards.map(card => card.motif))).toEqual(new Set(motifs))
    expect(new Set(cards.map(card => card.fingerprint)).size).toBe(cards.length)
  })

  it('assigns stable generic rarities and reserves legendary cards and variants for named terms', () => {
    const cards = Array.from({ length: 240 }, (_, index) => cardDesign('term ' + index))
    expect(new Set(cards.map(card => card.identity?.rarity))).toEqual(new Set(['N', 'R', 'SR']))
    expect(cards.some(card => card.identity?.variant)).toBe(false)
    expect(cardDesign('adapt').identity).toEqual({ rarity: 'SR', kind: '月蛾', variant: '星辉异种' })
    expect(cardDesign('moth').identity?.variant).toBeUndefined()
    for (const motif of motifs) {
      expect(new Set(cards.filter(card => card.motif === motif).map(card => card.identity)).size).toBe(1)
    }
    const legendary = ['monument', 'compass', 'summit', 'crystal', 'horizon', 'immense'].map(term => cardDesign(term))
    expect(legendary.every(card => card.identity?.rarity === 'UR')).toBe(true)
    expect(new Set(legendary.map(card => card.motif)).size).toBe(legendary.length)
  })

  it('uses a different full illustration for all 18 creatures and pairs both alternate forms', () => {
    const designs = creatureWords.map(word => cardDesign(word.word))
    expect(new Set(designs.map(card => card.motif)).size).toBe(18)
    expect(designs.every(card => card.series === 'creatures')).toBe(true)
    expect(cardDesign('crystallize').identity?.variant).toBe('晶化异种')
    expect(cardDesign('vanish').identity?.variant).toBe('幽影异种')
    expect(alternateCreature('refract')?.word).toBe('crystallize')
    expect(alternateCreature('vanish')?.word).toBe('endure')
    expect(cardDesign('vanish', true)).toEqual(cardDesign('sustain', true))
  })

  it('adds 16 distinct exotic cards alongside the first series', () => {
    const [original, exotic] = artBooks
    expect([original.words.length, exotic.words.length]).toEqual([18, 16])
    const designs = artBooks.flatMap(book => book.words.map(word => cardDesign(word.word)))
    expect(new Set(designs.map(card => card.motif)).size).toBe(34)
    expect(cardDesign('colossal')).toMatchObject({ motif: 'canyon-tortoise', series: 'exotic', identity: { rarity: 'UR' } })
    expect(alternateCreature('radiate')?.word).toBe('adhere')
  })

  it('gives representative motifs distinct effects independently of rarity', () => {
    expect(['transparent', 'eclipse', 'discharge', 'crystallize', 'radiate', 'evade', 'gather'].map(word => cardDesign(word).effect))
      .toEqual(['water', 'halo', 'arc', 'prism', 'embers', 'mist', 'motes'])
    expect(cardDesign('discharge', true).effect).toBeUndefined()
  })
})
