import { SEGMENT_COLORS } from '../constants/evacuation'

interface EvacProgressProps {
    roster: number
    safe: number
    moving: number
    unaccounted: number
    className?: string
}

/**
 * Stacked bar of an evacuation's roster: safe (evacuated) · moving · unaccounted.
 * Widths are shares of the roster; a zero roster renders an empty track.
 */
const EvacProgress = ({ roster, safe, moving, unaccounted, className }: EvacProgressProps) => {
    const pct = (n: number) => (roster > 0 ? (n / roster) * 100 : 0)
    const segments = [
        { key: 'safe', value: safe, color: SEGMENT_COLORS.safe },
        { key: 'moving', value: moving, color: SEGMENT_COLORS.moving },
        { key: 'unaccounted', value: unaccounted, color: SEGMENT_COLORS.unaccounted },
    ]

    return (
        <div
            className={`bg-muted flex h-2.5 w-full overflow-hidden rounded-full ${className ?? ''}`}
        >
            {segments.map((s) => (
                <div
                    key={s.key}
                    style={{ width: `${pct(s.value)}%`, backgroundColor: s.color }}
                    className='h-full transition-all'
                />
            ))}
        </div>
    )
}

export default EvacProgress
