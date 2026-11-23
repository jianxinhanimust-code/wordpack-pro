import { describe, expect, it } from 'vitest'
import { cardDesign, illustrationUrl, motifs } from './cardArt'
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
    const designs = [original, exotic].flatMap(book => book.words.map(word => cardDesign(word.word)))
    expect(new Set(designs.map(card => card.motif)).size).toBe(34)
    expect(cardDesign('colossal')).toMatchObject({ motif: 'canyon-tortoise', series: 'exotic', identity: { rarity: 'UR' } })
    expect(alternateCreature('radiate')?.word).toBe('adhere')
  })

  it('adds 16 original Variety series entries with two legends and a paired animated variant', () => {
    const variety = artBooks[2]
    expect(variety.words).toHaveLength(16)
    const designs = artBooks.slice(0, 3).flatMap(book => book.words.map(word => cardDesign(word.word)))
    expect(new Set(designs.map(card => card.motif)).size).toBe(50)
    expect(cardDesign('pierce')).toMatchObject({ motif: 'glacier-narwhal', effect: 'frost', identity: { rarity: 'UR' } })
    expect(cardDesign('shelter')).toMatchObject({ motif: 'canopy-sloth', effect: 'motes', identity: { rarity: 'UR' } })
    expect(cardDesign('velvet').identity?.variant).toBeUndefined()
    expect(cardDesign('frost')).toMatchObject({ effect: 'frost', identity: { variant: '霜化异种' } })
    expect(alternateCreature('frost')?.word).toBe('vibrate')
  })

  it('maps all 80 numbered portraits without collisions and keeps seven genuine alternate-form links', () => {
    const added = artBooks.slice(3)
    expect(added.map(book => book.words.length)).toEqual([18, 18, 14, 12, 18])
    const designs = artBooks.flatMap(book => book.words.map(word => cardDesign(word.word)))
    expect(new Set(designs.map(card => card.motif)).size).toBe(130)
    const atlas = added.flatMap(book => book.words.map(word => ({ word: word.word, ...cardDesign(word.word) })))
    expect(atlas.every(card => card.effect && illustrationUrl(card.motif).includes('/card-art/atlas/'))).toBe(true)
    expect(new Set(atlas.filter(card => card.identity?.rarity === 'UR').map(card => card.motif)).size).toBe(9)
    const variants = atlas.filter(card => card.identity?.variant)
    expect(variants).toHaveLength(7)
    for (const variant of variants) {
      const base = alternateCreature(variant.word)!
      expect(base.series).toBe(variant.series)
      expect(base.art).not.toBe(variant.motif)
      expect(alternateCreature(base.word)?.word).toBe(variant.word)
    }
    expect(cardDesign('gear').effect).toBe('cogs')
    expect(cardDesign('icy').effect).toBe('frost')
  })

  it('gives representative motifs distinct effects independently of rarity', () => {
    expect(['transparent', 'eclipse', 'discharge', 'crystallize', 'radiate', 'evade', 'gather'].map(word => cardDesign(word).effect))
      .toEqual(['water', 'halo', 'arc', 'prism', 'embers', 'mist', 'motes'])
    expect(cardDesign('discharge', true).effect).toBeUndefined()
  })
})
