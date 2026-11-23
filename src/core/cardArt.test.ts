import { describe, expect, it } from 'vitest'
import { cardDesign, motifs } from './cardArt'
import { alternateCreature, creatureWords } from '@/data/creatures'

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

  it('assigns the same rarity to each illustration and includes all four tiers', () => {
    const cards = Array.from({ length: 240 }, (_, index) => cardDesign('term ' + index))
    expect(new Set(cards.map(card => card.identity?.rarity))).toEqual(new Set(['N', 'R', 'SR', 'UR']))
    expect(cardDesign('adapt').identity).toEqual({ rarity: 'SR', kind: '月蛾', variant: '星辉异种' })
    for (const motif of motifs) {
      expect(new Set(cards.filter(card => card.motif === motif).map(card => card.identity)).size).toBe(1)
    }
  })

  it('uses a different full illustration for all 18 creatures and pairs both alternate forms', () => {
    const designs = creatureWords.map(word => cardDesign(word.word))
    expect(new Set(designs.map(card => card.motif)).size).toBe(18)
    expect(designs.every(card => card.creature)).toBe(true)
    expect(cardDesign('crystallize').identity?.variant).toBe('晶化异种')
    expect(cardDesign('vanish').identity?.variant).toBe('幽影异种')
    expect(alternateCreature('refract')?.word).toBe('crystallize')
    expect(alternateCreature('vanish')?.word).toBe('endure')
    expect(cardDesign('vanish', true)).toEqual(cardDesign('sustain', true))
  })
})
