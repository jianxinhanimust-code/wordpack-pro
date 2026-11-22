import { wordKey } from './schema'

export const motifs = [
  'arches', 'waters', 'tiles', 'wing', 'vessel', 'compass', 'phase', 'iris',
  'tree', 'summits', 'astrolabe', 'facet', 'hourglass', 'braid', 'shell', 'eclipse',
] as const
type Motif = typeof motifs[number]

const palettes = [
  { ink: '#191428', field: '#4b3470', light: '#e3c7ff', metal: '#af91ef' },
  { ink: '#0b2324', field: '#175c59', light: '#b6f4dc', metal: '#66d6bc' },
  { ink: '#2a1518', field: '#763d31', light: '#ffd6ae', metal: '#ec9a76' },
  { ink: '#281529', field: '#713967', light: '#ffcee7', metal: '#e99acc' },
  { ink: '#101d33', field: '#2c4f85', light: '#c9e2ff', metal: '#85bdfa' },
  { ink: '#242013', field: '#675432', light: '#fff0b9', metal: '#e4be68' },
  { ink: '#17251c', field: '#3c6247', light: '#e0f0b2', metal: '#abc883' },
  { ink: '#1b162f', field: '#443c82', light: '#dbdcff', metal: '#a39bf5' },
  { ink: '#172223', field: '#3b6368', light: '#e2f1f2', metal: '#8abfc5' },
  { ink: '#2a1b23', field: '#743746', light: '#ffd4d0', metal: '#f192a3' },
] as const
type Palette = typeof palettes[number]
const featured = new Map<string, [Motif, number]>([
  ['sustain', ['arches', 5]], ['derive', ['waters', 1]], ['allocate', ['tiles', 2]],
  ['adapt', ['wing', 3]], ['adopt', ['vessel', 4]], ['retain', ['hourglass', 7]],
  ['maintain', ['tree', 6]], ['inspect', ['iris', 8]], ['prospect', ['summits', 0]],
  ['spectator', ['astrolabe', 5]], ['enhance', ['facet', 9]], ['diminish', ['phase', 7]],
])

function hashWord(word: string) {
  let hash = 2166136261
  for (const letter of word) hash = Math.imul(hash ^ letter.codePointAt(0)!, 16777619)
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x7feb352d)
  return (hash ^ (hash >>> 15)) >>> 0
}

export function cardDesign(text: string, concealed = false) {
  const key = concealed ? '' : wordKey(text)
  const seed = hashWord(key)
  const entry = featured.get(key)
  const motif: Motif = concealed ? 'compass' : entry?.[0] ?? motifs[seed % motifs.length]
  return {
    seed, motif, fingerprint: motif + '-' + seed.toString(36),
    palette: palettes[concealed ? 0 : entry?.[1] ?? ((seed >>> 7) % palettes.length)],
    frame: (seed >>> 17) % 3,
    layers: 4 + ((seed >>> 13) % 4),
    sway: ((seed >>> 21) % 11) - 5,
  }
}

type Design = ReturnType<typeof cardDesign>
type Pen = {
  ctx: CanvasRenderingContext2D
  palette: Palette
  layers: number
  fill: CanvasGradient
  stroke: CanvasGradient
}
const turn = Math.PI * 2

function shape(pen: Pen, commands: string, shadow = 0.16, alpha = 0.86, width = 1.2) {
  const { ctx, fill, stroke } = pen
  const path = new Path2D(commands)
  if (shadow) {
    ctx.fillStyle = fill
    ctx.globalAlpha = shadow
    ctx.fill(path)
  }
  ctx.strokeStyle = stroke
  ctx.lineWidth = width
  ctx.globalAlpha = alpha
  ctx.stroke(path)
}

function oval(pen: Pen, x: number, y: number, rx: number, ry: number, angle = 0, alpha = 0.52) {
  const { ctx, palette } = pen
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, angle, 0, turn)
  ctx.strokeStyle = palette.light
  ctx.globalAlpha = alpha
  ctx.lineWidth = 1
  ctx.stroke()
}

const engravings: Record<Motif, (pen: Pen) => void> = {
  arches(p) {
    for (let i = 0; i < p.layers; i++) {
      const x = 66 - i * 7
      const top = -72 + i * 10
      shape(p, `M${-x},68 V-3 Q${-x},${top + 21} 0,${top} Q${x},${top + 21} ${x},-3 V68Z`, i === 0 ? .1 : 0, .32 + i * .09)
    }
    shape(p, 'M-68 62 H68 M-65 69 H65 M0 -43 L13 -25 0 -8 -13 -25Z', .35)
    shape(p, 'M-21 62 V21 L0 4 21 21 V62Z M-9 62 V32 L0 22 9 32 V62', .28)
  },
  waters(p) {
    for (let i = 0; i < p.layers + 5; i++) {
      const y = -66 + i * 12
      shape(p, `M-76,${y + 28} C-43,${y - 25} -42,${y - 27} -12,${y - 13} S28,${y + 48} 75,${y - 14}`, 0, .28 + (i % 4) * .16, i % 3 === 0 ? 2 : .9)
    }
    shape(p, 'M-71 19 C-46 -53 -1 -43 18 2 C35 37 58 13 78 -11 C41 54 24 44 4 15 C-23 -22 -49 -14 -71 19Z', .35)
    shape(p, 'M-4 -49 l8 11 -8 11 -8 -11Z M29 48 l5 7 -5 7 -5 -7Z', .45)
  },
  tiles(p) {
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (Math.abs(row - 2) + Math.abs(col - 2) > 3) continue
        const x = (col - 2) * 27
        const y = (row - 2) * 26
        const a = 13 + ((row + col + p.layers) % 2)
        shape(p, `M${x},${y-a} l${a},${a} -${a},${a} -${a},-${a}Z M${x-a},${y} H${x+a}`,
          .12 + ((row * 5 + col + p.layers) % 5) * .11, .42 + ((row + col) % 2) * .36)
      }
    }
    shape(p, 'M0 -74 L76 0 0 74 -76 0Z', 0, .67)
  },
  wing(p) {
    for (const side of [-1, 1]) {
      const { ctx } = p
      ctx.save()
      ctx.scale(side, 1)
      shape(p, 'M1 0 C20 -48 50 -69 73 -57 C76 -23 61 1 38 9 C60 26 54 53 34 62 C14 61 7 38 1 0Z', .34, .98, 1.7)
      for (let i = 0; i < p.layers; i++) {
        shape(p, `M3 4 Q${13+i*6} ${-8-i*6} ${24+i*8} ${-29-i*4}`, 0, .6)
        shape(p, `M4 13 Q${12+i*5} ${19+i*6} ${25+i*4} ${28+i*5}`, 0, .49)
      }
      oval(p, 50, -28, 12, 9, -.5, .74)
      ctx.restore()
    }
    shape(p, 'M0 39 V-7 C-2 -16 -10 -20 -18 -30 M0 -7 C2 -16 10 -20 18 -30', 0, .95, 1.7)
  },
  vessel(p) {
    shape(p, 'M-24 -67 H24 L23 -57 H13 C10 -39 12 -33 37 -20 C63 -6 56 20 44 38 C38 47 29 55 31 69 H-31 C-29 55 -38 47 -44 38 C-56 20 -63 -6 -37 -20 C-12 -33 -10 -39 -13 -57 H-23Z', .31, .96, 1.9)
    shape(p, 'M-28 -12 C-50 -4 -66 -7 -65 5 C-63 15 -55 16 -48 21 M28 -12 C50 -4 66 -7 65 5 C63 15 55 16 48 21 M-26 59 H26', 0, .81)
    for (let i = 0; i < p.layers; i++) oval(p, 0, -11 + i * 8, 41 - i * 2.5, 5, 0, .43)
    shape(p, 'M0 -20 L16 7 0 35 -16 7Z M0 -10 L9 7 0 23 -9 7Z', .37, .94)
  },
  compass(p) {
    oval(p, 0, 0, 65, 65)
    oval(p, 0, 0, 56, 56, 0, .76)
    for (let i = 0; i < 8; i++) {
      p.ctx.save()
      p.ctx.rotate(i * turn / 8)
      shape(p, `M0 -${i % 2 === 0 ? 65 : 47} L9 -10 0 0 -9 -10Z M0 -64 V-57`, i % 2 === 0 ? .44 : .17, .86)
      p.ctx.restore()
    }
    oval(p, 0, 0, 12, 12, 0, .94)
  },
  phase(p) {
    for (let i = 0; i < 7; i++) {
      const x = -58 + i * 19.5
      const y = 47 - Math.sin(i * Math.PI / 6) * 99
      const radius = i === 3 ? 17 : 11
      oval(p, x, y, radius, radius, 0, .7)
      shape(p, `M${x},${y-radius} a${radius},${radius} 0 0 1 0,${radius*2} q${(i-3)*7},-${radius} 0,-${radius*2}Z`, .44, .78)
    }
    shape(p, 'M-65 50 Q0 -18 65 50 M-54 59 Q0 13 54 59 M-27 51 H27 M0 26 V69', 0, .5)
  },
  iris(p) {
    const petals = p.layers + 4
    for (let i = 0; i < petals; i++) {
      p.ctx.save()
      p.ctx.rotate(i * turn / petals)
      shape(p, 'M0 7 C-8 -6 -30 -24 -16 -49 C-10 -61 -2 -65 0 -72 C2 -65 10 -61 16 -49 C30 -24 8 -6 0 7Z M0 -63 Q-8 -39 0 -13', .18, .73)
      p.ctx.restore()
    }
    oval(p, 0, 0, 12, 12, 0, .95)
  },
  tree(p) {
    shape(p, 'M-7 69 Q-12 28 0 -19 Q3 27 9 69Z M-65 70 Q0 54 65 70', .38, .89)
    for (const side of [-1, 1]) {
      p.ctx.save()
      p.ctx.scale(side, 1)
      for (let i = 0; i < p.layers; i++) {
        const y = 39 - i * 13
        const x = 59 - i * 6
        shape(p, `M0,${y} Q${x*.52},${y-1} ${x},${y-38} Q${x-7},${y-7} 0,${y+4}Z M${x*.62},${y-14} Q${x*.5},${y-37} ${x*.73},${y-46}`,
          .22, .73)
        oval(p, x, y - 38, 3.2, 4.2, .45, .91)
      }
      p.ctx.restore()
    }
  },
  summits(p) {
    shape(p, 'M-75 56 L-42 2 -21 18 12 -58 30 -25 45 -31 76 56Z M-16 18 L12 -58 19 -14 30 -25 M-62 36 L-42 2 -37 30 -21 18', .32, .97, 1.5)
    shape(p, 'M-75 56 L-33 31 -7 51 19 24 37 37 56 8 76 56Z', .33, .84)
    for (let i = 0; i < p.layers; i++) shape(p, `M${-69+i*5},${58+i*3} H${69-i*5}`, 0, .56-i*.055)
    oval(p, -39, -43, 15, 15, 0, .75)
  },
  astrolabe(p) {
    for (let i = 0; i < p.layers; i++) {
      oval(p, 0, 0, 69 - i * 2, 20 + i * 2, i * Math.PI / p.layers, .51)
    }
    for (const [x, y] of [[-52, -40], [44, 45], [17, -59]]) {
      shape(p, `M${x},${y-8} l6 8 -6 8 -6 -8Z`, .47, .96)
    }
    oval(p, 0, 0, 21, 21, 0, .77)
    shape(p, 'M0 -20 L13 0 0 20 -13 0Z', .43)
  },
  facet(p) {
    shape(p, 'M-57 -41 L26 -65 69 -22 44 48 -10 71 -63 30Z M-57 -41 L18 -27 26 -65 M69 -22 L18 -27 44 48 M-63 30 L18 -27 -10 71 M-57 -41 L-27 12 -63 30 M-27 12 L-10 71', .27, .93, 1.65)
    shape(p, 'M18 -27 L69 -22 44 48Z M-57 -41 L18 -27 -27 12Z', .33, .65)
    shape(p, 'M-74 -4 H-51 M35 -43 L59 -57 M56 59 H72 M-31 65 L-43 74', 0, .69)
  },
  hourglass(p) {
    shape(p, 'M-52 -70 H52 L47 -62 H-47Z M-52 70 H52 L47 62 H-47Z M-43 -61 C-40 -21 -8 -19 0 0 C8 19 40 21 43 61 H-43 C-40 21 -8 19 0 0 C8 -19 40 -21 43 -61Z', .24, .93, 1.65)
    shape(p, 'M-32 -43 Q0 -49 32 -43 Q19 -21 0 -4 Q-19 -21 -32 -43Z M-33 60 L0 25 33 60Z', .45, .81)
    for (let i = 0; i < p.layers; i++) oval(p, 0, 7 + i * 5, 2 + (i % 2), 2, 0, .83)
    shape(p, 'M-61 -61 V61 M61 -61 V61', 0, .39)
  },
  braid(p) {
    for (let i = 0; i < p.layers + 2; i++) {
      const scale = 1 - i * .062
      p.ctx.save()
      p.ctx.scale(scale, scale)
      shape(p, 'M-64 -29 C-25 -62 19 45 53 27 C85 10 62 -35 34 -28 C3 -21 -23 49 -59 29 C-81 17 -81 -13 -64 -29Z',
        i === 0 ? .26 : 0, .33 + (i % 3) * .21, i === 0 ? 1.7 : .8)
      p.ctx.restore()
    }
    shape(p, 'M0 -51 l8 12 -8 12 -8 -12Z M0 29 l8 12 -8 12 -8 -12Z', .35)
  },
  shell(p) {
    const { ctx, palette } = p
    const coil = (angle: number) => 2.8 * Math.exp(angle * .192)
    for (let offset = 0; offset < p.layers; offset++) {
      ctx.beginPath()
      for (let i = 0; i <= 111; i++) {
        const a = i * .147
        const r = coil(a) + offset * 2.1
        const x = Math.cos(a + offset * .066) * r
        const y = Math.sin(a + offset * .066) * r
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.globalAlpha = .4 + (offset % 3) * .21
      ctx.lineWidth = offset === 0 ? 2.1 : 1.25
      ctx.strokeStyle = palette.light
      ctx.stroke()
    }
    oval(p, 0, 0, 66, 66, 0, .32)
  },
  eclipse(p) {
    shape(p, 'M-64 9 A60 60 0 1 1 49 41 C-1 69 -50 48 -64 9Z M-51 6 A53 53 0 0 0 52 36 A46 46 0 0 1 -51 6Z', .35, .88, 1.45)
    for (let i = 0; i < p.layers + 1; i++) oval(p, 0, 3 + i * 5, 69 - i * 2, 16 + i * 2, -.27, .26 + i * .065)
    shape(p, 'M-60 48 L-53 57 -60 66 -67 57Z M63 -49 L69 -41 63 -33 57 -41Z', .45)
  },
}

export const artWidth = 200
export const artHeight = 280

function engravingLight(ctx: CanvasRenderingContext2D, palette: Palette, offset = 0) {
  const stroke = ctx.createLinearGradient(-offset - 58, -offset - 72, offset + 84, offset + 75)
  stroke.addColorStop(0, palette.metal)
  stroke.addColorStop(.29, palette.light)
  stroke.addColorStop(.42, '#fff4df')
  stroke.addColorStop(.58, palette.light)
  stroke.addColorStop(.81, palette.metal)
  stroke.addColorStop(1, palette.light)
  const fill = ctx.createLinearGradient(-offset - 53, offset + 70, offset + 53, -offset - 70)
  fill.addColorStop(0, palette.field)
  fill.addColorStop(.45, palette.metal)
  fill.addColorStop(.58, palette.light)
  fill.addColorStop(1, palette.metal)
  return { stroke, fill }
}

export function paintCard(canvas: HTMLCanvasElement, design: Design) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(canvas.width / artWidth, 0, 0, canvas.height / artHeight, 0, 0)
  ctx.clearRect(0, 0, artWidth, artHeight)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const { palette, frame, layers, sway } = design
  const pen = { ctx, palette, layers, ...engravingLight(ctx, palette, 100) }
  const rim = [
    'M20 10 H180 L190 20 V260 L180 270 H20 L10 260 V20Z',
    'M10 29 Q10 10 29 10 H171 Q190 10 190 29 V251 Q190 270 171 270 H29 Q10 270 10 251Z',
    'M13 50 Q13 12 59 10 H141 Q187 12 187 50 V253 L171 270 H29 L13 253Z',
  ][frame]
  shape(pen, rim, 0, .54, .85)
  shape(pen, 'M20 25 V20 H34 M166 20 H180 V25 M20 255 V260 H34 M166 260 H180 V255 M31 201 H84 M116 201 H169 M100 197 L104 201 100 205 96 201Z', .19, .66, .8)

  let state = design.seed
  function random() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
  ctx.fillStyle = palette.light
  for (let i = 0; i < 56; i++) {
    const x = 20 + random() * 160
    const y = 24 + random() * 166
    const radius = .32 + random() * .8
    ctx.globalAlpha = .1 + random() * .34
    ctx.fillRect(x, y, radius * 1.4, radius)
  }
  ctx.save()
  ctx.translate(100 + sway * .66, 109)
  ctx.rotate(sway * .022)
  const scale = .91 + (design.seed % 17) * .008
  ctx.scale(scale, scale)
  engravings[design.motif]({ ...pen, ...engravingLight(ctx, palette) })
  ctx.restore()
  ctx.globalAlpha = 1
}

