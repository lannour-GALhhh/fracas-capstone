import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import zamboanga from '../assets/zamboanga.json'

type Ring = number[][]
type BarangayFeature = Feature<Polygon | MultiPolygon, { code: string; name: string }>

const features = (zamboanga as FeatureCollection<Polygon | MultiPolygon, { code: string; name: string }>).features as BarangayFeature[]

const ringsOf = (f: BarangayFeature): Ring[] =>
	f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates.flat()

const ROTATION = 0
const SHEAR = 0
const lngK = Math.cos((7.2 * Math.PI) / 180)
const [cos, sin] = [Math.cos(ROTATION), Math.sin(ROTATION)]

const transform = ([lng, lat]: number[]) => {
	const [x, y] = [lng * lngK, lat]
	const [rx, ry] = [x * cos - y * sin, x * sin + y * cos]
	return [rx + SHEAR * ry, ry]
}

const FLICKERS = ['city-flicker-a', 'city-flicker-b', 'city-flicker-c']
const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)
const flickerStyle = () => ({
	animationName: FLICKERS[Math.floor(Math.random() * FLICKERS.length)],
	animationDuration: `${randomBetween(2.5, 9).toFixed(2)}s`,
	animationDelay: `-${randomBetween(0, 9).toFixed(2)}s`,
})

const shapes = features.map((f) => ({
	flicker: flickerStyle(),
	code: f.properties.code,
	name: f.properties.name,
	rings: ringsOf(f).map((ring) => ring.map(transform)),
}))

const bbox = shapes.flatMap((s) => s.rings).flat().reduce(
	(b, [x, y]) => ({ minX: Math.min(b.minX, x), maxX: Math.max(b.maxX, x), minY: Math.min(b.minY, y), maxY: Math.max(b.maxY, y) }),
	{ minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
)

const ZOOM = 1.1
const LIFT = -0.1
const SHIFT_X = 0.05


const buildPaths = (width: number, height: number) => {
	const k = ZOOM * Math.max(width / (bbox.maxX - bbox.minX), height / (bbox.maxY - bbox.minY))
	const point = ([x, y]: number[]) => `${(width * SHIFT_X + (x - bbox.minX) * k).toFixed(1)} ${(height * (1 - LIFT) - (y - bbox.minY) * k).toFixed(1)}`
	return shapes.map(({ code, name, rings, flicker }) => ({
		code,
		flicker,
		name,
		d: rings.map((ring) => `M${ring.map(point).join('L')}Z`).join(''),
	}))
}

const CityMap = ({ className }: { className?: string }) => {
	const frame = useRef<HTMLDivElement>(null)
	const [size, setSize] = useState({ width: 0, height: 0 })

	useLayoutEffect(() => {
		const el = frame.current
		if (!el) return
		const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight })
		measure()
		const observer = new ResizeObserver(measure)
		observer.observe(el)
		return () => observer.disconnect()
	}, [])

	const paths = useMemo(() => (size.width ? buildPaths(size.width, size.height) : []), [size])

	return (
		<div ref={frame} className={className}>
			<svg
				width={size.width}
				height={size.height}
				className='block'
				role='img'
				aria-label='Map of Zamboanga City barangays'
			>
				<defs>
					<style>{`
						.city-flicker { animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
						@keyframes city-flicker-a { 0%,100% { opacity: .9 } 12% { opacity: .35 } 31% { opacity: 1 } 58% { opacity: .5 } 73% { opacity: .85 } 90% { opacity: .3 } }
						@keyframes city-flicker-b { 0%,100% { opacity: .5 } 22% { opacity: 1 } 37% { opacity: .75 } 64% { opacity: .25 } 82% { opacity: .95 } }
						@keyframes city-flicker-c { 0%,100% { opacity: 1 } 9% { opacity: .6 } 27% { opacity: .2 } 49% { opacity: .9 } 68% { opacity: .45 } 85% { opacity: 1 } }
						@media (prefers-reduced-motion: reduce) { .city-flicker { animation: none !important } }
					`}</style>
					<pattern id='city-dots' width='10' height='10' patternUnits='userSpaceOnUse'>
						<circle cx='5' cy='5' r='2' className='fill-[#b0bccd]' />
					</pattern>
					<pattern id='city-dots-active' width='10' height='10' patternUnits='userSpaceOnUse'>
						<circle cx='5' cy='5' r='2' className='fill-slate-600' />
					</pattern>
				</defs>
				<g fill='url(#city-dots)' className='stroke-[#b0bccd]' strokeWidth={3} strokeLinecap='round' strokeLinejoin='round' strokeDasharray='0 8'>
					{paths.map(({ code, name, d, flicker }) => (
						<path
							key={code}
							d={d}
							style={flicker}
							className='city-flicker cursor-default transition-[stroke] duration-200 hover:[fill:url(#city-dots-active)] hover:stroke-slate-600'
						>
							<title>{name}</title>
						</path>
					))}
				</g>
			</svg>
		</div>
	)
}

export default memo(CityMap)
