import type { Exam } from '@/core/schema'
import type { ArtBookId } from '@/data/creatures'
import type { CSSProperties } from 'react'
import { illustrationUrl } from '@/core/cardArt'

const covers = {
  cet4: ['vessel', 'waters', 'iris'],
  cet6: ['facet', 'arches', 'wing'],
  creatures: ['moss-otter', 'eclipse-phoenix', 'prism-beetle-crystal'],
  exotic: ['glass-octopus', 'canyon-tortoise', 'salt-gecko-obsidian'],
  variety: ['canopy-sloth', 'glacier-narwhal', 'glasswing-cicada-frost'],
} as const

export function CollectorCover({ exam }: { exam: Exam | ArtBookId }) {
  return <div className="collector-cover" aria-hidden="true">
    {covers[exam].map((motif, index) => <span className="cover-card" key={motif} style={{ '--slot': index } as CSSProperties}>
      <img src={illustrationUrl(motif)} alt="" decoding="async" draggable={false}/>
      <i/>
    </span>)}
  </div>
}
