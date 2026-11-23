import type { Motif } from './cardArt'
import type { CreatureArt } from '@/data/creatures'
import type { AtlasArt } from '@/data/atlasCards'
import type { CSSProperties } from 'react'

export const effectColors = {
  water: { main: '#55defa', glint: '#b9fff4', accent: '#5588ff' },
  halo: { main: '#ffc268', glint: '#fff0bc', accent: '#ff81af' },
  arc: { main: '#728eff', glint: '#ccf5ff', accent: '#be9cff' },
  prism: { main: '#c895fb', glint: '#fff1fa', accent: '#7ef3dd' },
  embers: { main: '#ff8b59', glint: '#fff1bf', accent: '#fb4c57' },
  mist: { main: '#a9c2ff', glint: '#f0fcff', accent: '#c498e6' },
  motes: { main: '#a8df81', glint: '#fff6be', accent: '#f4b98e' },
  frost: { main: '#7bcbff', glint: '#ebfbff', accent: '#a9aaff' },
  cogs: { main: '#dba366', glint: '#ffe9b5', accent: '#f78550' },
} as const
export type CardEffect = keyof typeof effectColors
export type CardEffectStyle = CSSProperties & Record<`--${string}`, string | number>

export function effectStyle(effect: CardEffect | undefined): CardEffectStyle {
  if (!effect) return {}
  const color = effectColors[effect]
  return { '--effect-color': color.main, '--effect-glint': color.glint, '--effect-accent': color.accent }
}

export const effectForArt: Partial<Record<Motif | CreatureArt, CardEffect>> = {
  arches: 'halo', waters: 'water', tiles: 'arc', wing: 'motes', vessel: 'water', compass: 'halo', phase: 'mist',
  iris: 'prism', tree: 'motes', summits: 'mist', astrolabe: 'halo', facet: 'prism', hourglass: 'embers', braid: 'mist',
  shell: 'water', eclipse: 'halo',
  'moss-otter': 'water', 'dunes-armadillo': 'embers', 'reed-crane': 'mist', 'tidal-crab': 'water',
  'amber-hedgehog': 'motes', 'prism-beetle': 'prism', 'storm-lynx': 'arc', 'glacial-koi': 'water',
  'obsidian-caiman': 'embers', 'mist-fox': 'mist', 'thunder-ray': 'arc', 'crystal-stag': 'prism',
  'tide-nautilus': 'water', 'bloom-mantis': 'motes', 'eclipse-phoenix': 'halo', 'abyss-leviathan': 'water',
  'prism-beetle-crystal': 'prism', 'glacial-koi-shadow': 'mist',
  'salt-gecko': 'halo', 'leafcutter-ant': 'motes', 'mangrove-frog': 'water', 'winter-pika': 'mist',
  'cotton-bumblebee': 'motes', 'dusk-jerboa': 'embers', 'glass-octopus': 'water', 'lantern-bat': 'embers',
  'rain-tapir': 'mist', 'comb-sea-angel': 'water', 'fern-jumping-spider': 'motes', 'iron-root-secretarybird': 'embers',
  'tide-bell-jellyfish': 'water', 'canyon-tortoise': 'embers', 'aurora-siphonophore': 'prism', 'salt-gecko-obsidian': 'embers',
  'cinder-pangolin': 'embers', 'dew-chameleon': 'motes', 'pebble-puffin': 'water', 'velvet-moth': 'motes',
  'moss-salamander': 'water', 'glasswing-cicada': 'prism', 'sand-ray-hound': 'embers', 'coral-boxfish': 'water',
  'peat-owl': 'mist', 'iron-stag-beetle': 'arc', 'kelp-seadragon': 'water', 'ash-condor': 'embers',
  'amber-centipede': 'embers', 'glacier-narwhal': 'frost', 'canopy-sloth': 'motes', 'glasswing-cicada-frost': 'frost',
} satisfies Record<Motif | Exclude<CreatureArt, AtlasArt>, CardEffect>
