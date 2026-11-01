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
const RAIN_COLOR = '186, 212, 255'
const WASH_COLOR = '70, 110, 190'
/** Slight wind lean, px of horizontal travel per px of fall. */
const SLANT = 0.18
/** Screen-pixel stroke width: fixed, so streaks look the same at every zoom. */
const STROKE_WIDTH = 2.5
/** Screen px above each barangay where drops start, so rain falls in from the sky. */
const SKY_LEAD = 90

interface Drop {
    /** 0–1 within the barangay's bbox plus the sky band above it; survives pan/zoom without reseeding. */
    u: number
    v: number
    /** Per-drop speed jitter, 0.75–1.25. */
    k: number
}

/** Screen-space geometry; rebuilt only when the camera moves, not every frame. */
interface Projected {
    path: Path2D
    sky: Path2D
    fade: CanvasGradient
    minX: number
    minY: number
    bw: number
    bh: number
}

interface Cell {
    style: RainStyle
    drops: Drop[]
    geo: Projected | null
    want: number
    /** Rings in lng/lat, one array per polygon ring. */
    rings: [number, number][][]
}

const toCells = (data: RiskFeatureCollection): Cell[] => {
    const cells: Cell[] = []
    for (const f of data.features) {
        const tier = rainfallTier(f.properties.current_rainfall)
        if (tier === 'none') continue
        const g = f.geometry
        const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
        cells.push({
            style: RAIN_STYLES[tier],
            drops: [],
            geo: null,
            want: 0,
            rings: polys.flat() as [number, number][][],
        })
    }
    return cells
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
            if (bw < 4 || bh < 4 || maxX < 0 || maxY < 0 || minX > w || minY > h + SKY_LEAD) return null

            // Sky column = outline swept upward, built once per camera change.
            const sky = new Path2D()
            const step = Math.max(6, Math.min(24, bh * 0.7))
            for (let k = 0; k <= SKY_LEAD; k += step) sky.addPath(path, new DOMMatrix().translate(0, -k))

            // Fade in from the top of the sky band so rain emerges from nothing.
            const fade = ctx.createLinearGradient(0, minY - SKY_LEAD, 0, minY)
            fade.addColorStop(0, `rgba(${RAIN_COLOR}, 0)`)
            fade.addColorStop(1, `rgba(${RAIN_COLOR}, ${cell.style.alpha})`)
            return { path, sky, fade, minX, minY, bw, bh }
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
                cell.want = Math.min(MAX_DROPS, Math.max(3, Math.round(((g.bw * (g.bh + SKY_LEAD)) * cell.style.density) / 10000)))
                demand += cell.want
            }
            const scale = demand > MAX_TOTAL_DROPS ? MAX_TOTAL_DROPS / demand : 1

            for (const cell of cells) {
                const g = cell.geo
                if (!g) continue
                const { style } = cell
                const fh = g.bh + SKY_LEAD
                const want = Math.max(2, Math.round(cell.want * scale))
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
                ctx.strokeStyle = g.fade
                ctx.beginPath()
                for (const d of cell.drops) {
                    d.v += (style.speed * d.k * dt) / fh
                    if (d.v > 1) {
                        d.v -= 1
                        d.u = Math.random()
                    }
                    const x = g.minX + d.u * g.bw
                    const y = g.minY - SKY_LEAD + d.v * fh
                    ctx.moveTo(x, y)
                    ctx.lineTo(x - style.length * SLANT, y - style.length)
                }
                ctx.stroke()
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
