import { useEffect, useRef } from 'react'
import { useMap } from '@/common/ui/map'
import type { RiskFeatureCollection } from '../types/api'
import { RAIN_STYLES, rainfallTier, type RainStyle } from '../constants/rainfall'

interface Props {
    data: RiskFeatureCollection | null
    visible: boolean
}

/** Cap per barangay so a zoomed-in giant polygon can't stall the frame. */
const MAX_DROPS = 250
/** Cap across all barangays; shared out proportionally when exceeded. */
const MAX_TOTAL_DROPS = 1500
/** Minimum ms between repaints (~35 fps): rain reads fine and costs half of 60 fps. */
const FRAME_INTERVAL_MS = 28
/** Device-pixel-ratio ceiling; rain streaks don't need retina fill-rate. */
const MAX_DPR = 1.5
/** Outline vertices closer than this (screen px) to the previous kept one are dropped. */
const SIMPLIFY_PX = 1.5
const RAIN_COLOR = '235, 245, 255'
/** Dark outline drawn under each streak so it stays visible on light backdrops. */
const HALO_COLOR = '70, 105, 170'
/** Halo is wider than the core by this many px, and never fainter than the core. */
const HALO_EXTRA = 2.5
/** Streak opacity floor/boost: the old tier alphas (0.35+) vanished on pale fills. */
const coreAlpha = (a: number) => Math.min(1, 0.55 + a * 0.5)
const WASH_COLOR = '70, 110, 190'
/** Slight wind lean, px of horizontal travel per px of fall. */
const SLANT = 0.18
/** Screen-pixel stroke width: fixed, so streaks look the same at every zoom. */
const STROKE_WIDTH = 2.5
/** Extra sky above the cloud base that rain fades in from. */
const SKY_LEAD = 30
/** Cloud height above the ground in screen px: a little when seen from above, a lot from a low angle. */
const LIFT_MIN = 14
const LIFT_PITCH = 110
/** Cap on cloud puffs across all barangays. */
const MAX_TOTAL_PUFFS = 700
const MAX_PUFFS = 90

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Soft round puff sprite, white-to-grey by `shade`; `under` darkens it for cloud bellies. */
const makeSprite = (shade: number, under: boolean): HTMLCanvasElement => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')!
    const level = Math.round(lerp(252, 70, shade) * (under ? lerp(0.95, 0.72, shade) : 1))
    const rgb = `${level}, ${level}, ${Math.min(255, level + 8)}`
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32)
    grad.addColorStop(0, `rgba(${rgb}, 1)`)
    grad.addColorStop(0.55, `rgba(${rgb}, 0.7)`)
    grad.addColorStop(1, `rgba(${rgb}, 0)`)
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
    return c
}

interface Drop {
    /** 0–1 within the barangay's bbox plus the sky band above it; survives pan/zoom without reseeding. */
    u: number
    v: number
    /** Per-drop speed jitter, 0.75–1.25. */
    k: number
}

/** Screen-space geometry; rebuilt only when the camera moves, not every frame. */
interface Puff {
    /** Which cloud mass (0 or 1) the puff belongs to. */
    k: number
    /** Offset from its mass's centre, each -1…1 (bell-shaped), scaled by the mass's spread. */
    du: number
    dv: number
    /** Size jitter 0.6–1.4, also the sway phase. */
    r: number
    /** Geometry the `inside` flag was computed for; recomputed when the camera moves. */
    inFor: Projected | null
    inside: boolean
}

interface Projected {
    path: Path2D
    /** Screen px between ground and cloud base at the current pitch. */
    lead: number
    sky: Path2D
    fade: CanvasGradient
    halo: CanvasGradient
    minX: number
    minY: number
    bw: number
    bh: number
}

interface Cell {
    style: RainStyle
    drops: Drop[]
    puffs: Puff[]
    /** Separate cloud masses: 2 over a large barangay, 1 over a small one. */
    masses: 1 | 2
    top: HTMLCanvasElement
    under: HTMLCanvasElement
    geo: Projected | null
    want: number
    wantPuffs: number
    /** Rings in lng/lat, one array per polygon ring. */
    rings: [number, number][][]
}

/** Shoelace area of a feature in deg² (lat-corrected); only used to rank barangays by size. */
const featureArea = (f: RiskFeatureCollection['features'][number]): number => {
    const g = f.geometry
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
    let total = 0
    for (const poly of polys) {
        poly.forEach((ring, i) => {
            let a = 0
            for (let j = 0; j < ring.length - 1; j++) a += ring[j][0] * ring[j + 1][1] - ring[j + 1][0] * ring[j][1]
            const lat = ring[0]?.[1] ?? 0
            total += (i === 0 ? 1 : -1) * Math.abs(a / 2) * Math.cos((lat * Math.PI) / 180)
        })
    }
    return total
}

const toCells = (data: RiskFeatureCollection): Cell[] => {
    const cells: Cell[] = []
    // "Large" = above the median barangay, so it's stable across zoom levels.
    const areas = data.features.map(featureArea).sort((a, b) => a - b)
    const median = areas[Math.floor(areas.length / 2)] ?? 0
    for (const f of data.features) {
        const tier = rainfallTier(f.properties.current_rainfall)
        if (tier === 'none') continue
        const g = f.geometry
        const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
        cells.push({
            style: RAIN_STYLES[tier],
            drops: [],
            puffs: [],
            masses: featureArea(f) > median ? 2 : 1,
            top: makeSprite(RAIN_STYLES[tier].cloud.shade, false),
            under: makeSprite(RAIN_STYLES[tier].cloud.shade, true),
            geo: null,
            want: 0,
            wantPuffs: 0,
            rings: polys.flat() as [number, number][][],
        })
    }
    return cells
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** Two masses sit at 27% / 73% along the barangay's longer axis; one sits in the middle. */
const massCentre = (k: number, masses: number) => (masses === 2 ? 0.27 + 0.46 * k : 0.5)

const puffU = (p: Puff, masses: number, g: Projected) => {
    const along = g.bw >= g.bh
    const c = along ? massCentre(p.k, masses) : 0.5
    const spread = along && masses === 2 ? 0.2 : 0.32
    return clamp01(c + p.du * spread)
}

const puffV = (p: Puff, masses: number, g: Projected) => {
    const along = g.bw >= g.bh
    const c = along ? 0.5 : massCentre(p.k, masses)
    const spread = !along && masses === 2 ? 0.2 : 0.32
    return clamp01(c + p.dv * spread)
}

/**
 * One canvas over the map that rains inside every barangay currently getting
 * rain. Streak density, speed, length and brightness follow the PAGASA tier.
 * Dependency-free: a single rAF loop clipped to the projected polygons.
 */
const RainfallLayer = ({ data, visible }: Props) => {
    const { map, isLoaded } = useMap()
    const cellsRef = useRef<Cell[]>([])

    useEffect(() => {
        cellsRef.current = data ? toCells(data) : []
    }, [data])

    useEffect(() => {
        if (!map || !isLoaded || !visible) return

        // The canvas container collapses to 0px (its child is absolutely
        // positioned), so size from the map canvas itself.
        const mapCanvas = map.getCanvas()
        const container = map.getCanvasContainer()
        const canvas = document.createElement('canvas')
        canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;width:100%;height:100%'
        container.appendChild(canvas)
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        let raf = 0
        let last = performance.now()

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const { clientWidth: w, clientHeight: h } = mapCanvas
            canvas.width = w * dpr
            canvas.height = h * dpr
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            dirty = true
        }

        let dirty = true
        let projectedFor: Cell[] | null = null

        /** Project + simplify one cell; null when off-screen or too small to see. */
        const project = (cell: Cell, w: number, h: number): Projected | null => {
            const path = new Path2D()
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
            for (const ring of cell.rings) {
                let lx = 0, ly = 0, first = true
                for (const [lng, lat] of ring) {
                    const p = map.project([lng, lat])
                    if (p.x < minX) minX = p.x
                    if (p.y < minY) minY = p.y
                    if (p.x > maxX) maxX = p.x
                    if (p.y > maxY) maxY = p.y
                    if (first) {
                        path.moveTo(p.x, p.y)
                        first = false
                    } else if (Math.abs(p.x - lx) + Math.abs(p.y - ly) >= SIMPLIFY_PX) {
                        path.lineTo(p.x, p.y)
                    } else continue
                    lx = p.x
                    ly = p.y
                }
                path.closePath()
            }
            const bw = maxX - minX
            const bh = maxY - minY
            const lead = LIFT_MIN + LIFT_PITCH * Math.sin((map.getPitch() * Math.PI) / 180) + SKY_LEAD
            if (bw < 4 || bh < 4 || maxX < 0 || maxY < 0 || minX > w || minY > h + lead) return null
            

            // Sky column = outline swept upward, built once per camera change.
            const sky = new Path2D()
            const step = Math.max(6, Math.min(24, bh * 0.7))
            for (let k = 0; k <= lead; k += step) sky.addPath(path, new DOMMatrix().translate(0, -k))

            // Fade in from the top of the sky band so rain emerges from nothing.
            const fade = ctx.createLinearGradient(0, minY - lead, 0, minY)
            fade.addColorStop(0, `rgba(${RAIN_COLOR}, 0)`)
            fade.addColorStop(1, `rgba(${RAIN_COLOR}, ${coreAlpha(cell.style.alpha)})`)
            const halo = ctx.createLinearGradient(0, minY - lead, 0, minY)
            halo.addColorStop(0, `rgba(${HALO_COLOR}, 0)`)
            halo.addColorStop(1, `rgba(${HALO_COLOR}, ${Math.min(0.6, cell.style.alpha + 0.1)})`)
            return { path, lead, sky, fade, halo, minX, minY, bw, bh }
        }

        const draw = (now: number) => {
            raf = requestAnimationFrame(draw)
            const elapsed = now - last
            if (elapsed < FRAME_INTERVAL_MS) return
            const dt = reduceMotion ? 0 : Math.min(elapsed / 1000, 0.05)
            last = now
            const w = mapCanvas.clientWidth
            const h = mapCanvas.clientHeight

            const cells = cellsRef.current
            if (dirty || cells !== projectedFor) {
                projectedFor = cells
                dirty = false
                for (const cell of cells) cell.geo = project(cell, w, h)
            }

            ctx.clearRect(0, 0, w, h)
            ctx.lineWidth = STROKE_WIDTH
            ctx.lineCap = 'round'

            // Budget drops across everything on screen.
            let demand = 0
            for (const cell of cells) {
                const g = cell.geo
                if (!g) continue
                cell.want = Math.min(MAX_DROPS, Math.max(1, Math.round(((g.bw * (g.bh + g.lead)) * cell.style.density) / 10000)))
                demand += cell.want
            }
            let puffDemand = 0
            for (const cell of cells) {
                const g = cell.geo
                if (!g) continue
                const c = cell.style.cloud
                const px = Math.max(8, Math.min(g.bw, g.bh) * c.size)
                cell.wantPuffs = Math.min(MAX_PUFFS, Math.max(3, Math.round((g.bw * g.bh * c.coverage) / (px * px * 1.6))))
                puffDemand += cell.wantPuffs * c.layers
            }
            const puffScale = puffDemand > MAX_TOTAL_PUFFS ? MAX_TOTAL_PUFFS / puffDemand : 1
            const scale = demand > MAX_TOTAL_DROPS ? MAX_TOTAL_DROPS / demand : 1

            for (const cell of cells) {
                const g = cell.geo
                if (!g) continue
                const { style } = cell
                const fh = g.bh + g.lead
                const want = Math.max(1, Math.round(cell.want * scale))
                while (cell.drops.length < want) {
                    cell.drops.push({ u: Math.random(), v: Math.random(), k: 0.75 + Math.random() * 0.5 })
                }
                cell.drops.length = want

                // Tint only the shape itself (no clip needed beyond the outline).
                ctx.save()
                ctx.clip(g.path, 'evenodd')
                ctx.fillStyle = `rgba(${WASH_COLOR}, ${style.wash})`
                ctx.fillRect(g.minX, g.minY, g.bw, g.bh)
                ctx.restore()

                // Streaks over the shape and the sky column above it.
                ctx.save()
                ctx.clip(g.sky, 'nonzero')
                ctx.beginPath()
                for (const d of cell.drops) {
                    d.v += (style.speed * d.k * dt) / fh
                    if (d.v > 1) {
                        d.v -= 1
                        d.u = Math.random()
                    }
                    const x = g.minX + d.u * g.bw
                    const y = g.minY - g.lead + d.v * fh
                    ctx.moveTo(x, y)
                    ctx.lineTo(x - style.length * SLANT, y - style.length)
                }
                // Two passes: dark halo, then light core. One of the two always
                // contrasts with whatever the map shows underneath.
                ctx.lineWidth = STROKE_WIDTH + HALO_EXTRA
                ctx.strokeStyle = g.halo
                ctx.stroke()
                ctx.lineWidth = STROKE_WIDTH
                ctx.strokeStyle = g.fade
                ctx.stroke()
                ctx.restore()

                // Cloud: soft puffs centred inside the barangay's outline (edges bleed past it), lifted above it.
                const c = style.cloud
                const px = Math.max(8, Math.min(g.bw, g.bh) * c.size)
                // Candidates over-sampled 2x: those whose centre falls outside the outline are skipped.
                const n = Math.max(2, Math.round(cell.wantPuffs * puffScale)) * 2
                while (cell.puffs.length < n) {
                    cell.puffs.push({ k: cell.puffs.length % cell.masses, du: Math.random() + Math.random() - 1, dv: Math.random() + Math.random() - 1, r: 0.6 + Math.random() * 0.8, inFor: null, inside: false })
                }
                cell.puffs.length = n
                const lift = g.lead - SKY_LEAD
                ctx.save()
                ctx.globalAlpha = c.alpha
                // Bellies first (dark, low), then lighter tops stacked upward = thickness.
                for (let layer = -1; layer < c.layers; layer++) {
                    const sprite = layer < 0 ? cell.under : cell.top
                    const up = Math.max(0, layer) * px * 0.3
                    for (const p of cell.puffs) {
                        const u = puffU(p, cell.masses, g)
                        const v = puffV(p, cell.masses, g)
                        if (p.inFor !== g) {
                            const k = ctx.getTransform().a
                            p.inFor = g
                            p.inside = ctx.isPointInPath(g.path, (g.minX + u * g.bw) * k, (g.minY + v * g.bh) * k, 'evenodd')
                        }
                        if (!p.inside) continue
                        const size = px * p.r * 2
                        const sway = reduceMotion ? 0 : Math.sin(now / 3500 + p.r * 40) * px * 0.15
                        const x = g.minX + u * g.bw + sway
                        const y = g.minY - lift + v * g.bh - up
                        ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size)
                    }
                }
                ctx.restore()
            }
        }

        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(mapCanvas)
        const markDirty = () => {
            dirty = true
        }
        map.on('move', markDirty)
        raf = requestAnimationFrame(draw)

        return () => {
            map.off('move', markDirty)
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.remove()
        }
    }, [map, isLoaded, visible])

    return null
}

export default RainfallLayer
