import { useEffect, useRef } from 'react'
import { useMap } from '@/common/ui/map'
import type { RiskFeatureCollection } from '../types/api'
import { RAIN_STYLES, rainfallTier, type RainStyle } from '../constants/rainfall'

interface Props {
    data: RiskFeatureCollection | null
    visible: boolean
}

/** Cap per barangay so a zoomed-in giant polygon can't stall the frame. */
const MAX_DROPS = 600
const RAIN_COLOR = '186, 212, 255'
const WASH_COLOR = '70, 110, 190'
/** Slight wind lean, px of horizontal travel per px of fall. */
const SLANT = 0.18
/** Screen-pixel stroke width: fixed, so streaks look the same at every zoom. */
const STROKE_WIDTH = 2.5
/** Screen px above each barangay where drops start, so rain falls in from the sky. */
const SKY_LEAD = 90
/** Spacing of the upward outline copies that form the sky column. */
const SKY_SWEEP_STEP = 10

interface Drop {
    /** 0–1 within the barangay's bbox plus the sky band above it; survives pan/zoom without reseeding. */
    u: number
    v: number
    /** Per-drop speed jitter, 0.75–1.25. */
    k: number
}

interface Cell {
    style: RainStyle
    drops: Drop[]
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
            const dpr = window.devicePixelRatio || 1
            const { clientWidth: w, clientHeight: h } = mapCanvas
            canvas.width = w * dpr
            canvas.height = h * dpr
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        }

        const draw = (now: number) => {
            const dt = reduceMotion ? 0 : Math.min((now - last) / 1000, 0.05)
            last = now
            const w = mapCanvas.clientWidth
            const h = mapCanvas.clientHeight
            ctx.clearRect(0, 0, w, h)

            for (const cell of cellsRef.current) {
                const path = new Path2D()
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                for (const ring of cell.rings) {
                    ring.forEach(([lng, lat], i) => {
                        const p = map.project([lng, lat])
                        if (p.x < minX) minX = p.x
                        if (p.y < minY) minY = p.y
                        if (p.x > maxX) maxX = p.x
                        if (p.y > maxY) maxY = p.y
                        if (i === 0) path.moveTo(p.x, p.y)
                        else path.lineTo(p.x, p.y)
                    })
                    path.closePath()
                }
                const bw = maxX - minX
                const bh = maxY - minY
                // Off-screen or sub-visible: skip the work.
                if (bw < 4 || bh < 4 || maxX < 0 || maxY < 0 || minX > w || minY > h) continue

                const { style } = cell
                // The drop field extends SKY_LEAD above the shape, so streaks
                // travel into the barangay rather than appearing inside it.
                const fh = bh + SKY_LEAD
                const want = Math.min(MAX_DROPS, Math.max(3, Math.round((bw * fh * style.density) / 10000)))
                while (cell.drops.length < want) {
                    cell.drops.push({ u: Math.random(), v: Math.random(), k: 0.75 + Math.random() * 0.5 })
                }
                cell.drops.length = want

                // Tint only the shape itself.
                ctx.save()
                ctx.clip(path, 'evenodd')
                ctx.fillStyle = `rgba(${WASH_COLOR}, ${style.wash})`
                ctx.fillRect(minX, minY, bw, bh)
                ctx.restore()

                // Streaks are visible over the shape *and* the column of sky
                // above it: sweep the outline upward and clip to that union.
                const sky = new Path2D()
                for (let k = 0; k <= SKY_LEAD; k += SKY_SWEEP_STEP) {
                    sky.addPath(path, new DOMMatrix().translate(0, -k))
                }
                ctx.save()
                ctx.clip(sky, 'nonzero')

                // Fade in from the top of the sky band so rain emerges from nothing.
                const fade = ctx.createLinearGradient(0, minY - SKY_LEAD, 0, minY)
                fade.addColorStop(0, `rgba(${RAIN_COLOR}, 0)`)
                fade.addColorStop(1, `rgba(${RAIN_COLOR}, ${style.alpha})`)
                ctx.strokeStyle = fade
                ctx.lineWidth = STROKE_WIDTH
                ctx.lineCap = 'round'
                ctx.beginPath()
                for (const d of cell.drops) {
                    d.v += (style.speed * d.k * dt) / fh
                    if (d.v > 1) {
                        d.v -= 1
                        d.u = Math.random()
                    }
                    const x = minX + d.u * bw
                    const y = minY - SKY_LEAD + d.v * fh
                    ctx.moveTo(x, y)
                    ctx.lineTo(x - style.length * SLANT, y - style.length)
                }
                ctx.stroke()
                ctx.restore()
            }
            raf = requestAnimationFrame(draw)
        }

        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(mapCanvas)
        raf = requestAnimationFrame(draw)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.remove()
        }
    }, [map, isLoaded, visible])

    return null
}

export default RainfallLayer
