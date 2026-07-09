import { RISK_COLORS } from '@/features/gis/constants/risk'
import { SUSCEPTIBILITY_LABELS } from '@/features/gis/constants/susceptibility'
import { useHotspots } from '../hooks/useAnalytics'
import type { AnalyticsWindow, Hotspot } from '../types/api'
import PanelCard from './PanelCard'

const nf = new Intl.NumberFormat()

/** 15-min scoring cycles → hours spent in that category. */
const cyclesToHours = (cycles: number) => cycles / 4

const HoursLabel = ({ cycles }: { cycles: number }) => {
    const h = cyclesToHours(cycles)
    return <span className='tabular-nums'>{h >= 10 ? h.toFixed(0) : h.toFixed(1)}h</span>
}

const Row = ({ rank, row, max }: { rank: number; row: Hotspot; max: number }) => {
    const criticalPct = max > 0 ? (row.critical_cycles / max) * 100 : 0
    const highPct = max > 0 ? (row.high_cycles / max) * 100 : 0
    return (
        <li className='flex items-center gap-3 py-2'>
            <span className='w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground'>
                {rank}
            </span>
            <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-1.5'>
                    <span className='truncate text-sm font-medium'>{row.barangay_name}</span>
                    {row.dominant_level && (
                        <span className='shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground'>
                            {SUSCEPTIBILITY_LABELS[row.dominant_level]} susceptibility
                        </span>
                    )}
                </div>
                {/* Stacked magnitude bar: critical over high, 2px surface gap between. */}
                <div className='mt-1 flex h-2 items-center gap-0.5'>
                    <div
                        className='h-full rounded-[3px]'
                        style={{ width: `${criticalPct}%`, backgroundColor: RISK_COLORS.critical }}
                    />
                    <div
                        className='h-full rounded-[3px]'
                        style={{ width: `${highPct}%`, backgroundColor: RISK_COLORS.high }}
                    />
                </div>
            </div>
            <div className='flex shrink-0 items-center gap-3 text-xs text-muted-foreground'>
                <span className='w-12 text-right font-medium text-foreground'>
                    <HoursLabel cycles={row.critical_cycles} />
                </span>
                <span className='w-10 text-right' title='Confirmed floods'>
                    {nf.format(row.flood_count)}
                </span>
            </div>
        </li>
    )
}

const HotspotLeaderboard = ({ days }: { days: AnalyticsWindow }) => {
    const { data, isLoading, isError, refetch } = useHotspots(days)
    const rows = data ?? []
    const max = rows.reduce((m, r) => Math.max(m, r.critical_cycles, r.high_cycles), 0)

    return (
        <PanelCard
            title='Flood hotspots'
            description='Barangays ranked by time spent critical (each bar: critical over high)'
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
            isEmpty={rows.length === 0}
            emptyMessage='No barangay reached high or critical in this window.'
            className='h-full'
        >
            <div className='flex items-center gap-4 pb-1 text-[11px] text-muted-foreground'>
                <span className='flex items-center gap-1'>
                    <span
                        className='size-2 rounded-[2px]'
                        style={{ backgroundColor: RISK_COLORS.critical }}
                    />
                    Critical
                </span>
                <span className='flex items-center gap-1'>
                    <span
                        className='size-2 rounded-[2px]'
                        style={{ backgroundColor: RISK_COLORS.high }}
                    />
                    High
                </span>
                <span className='ml-auto'>hrs = time critical</span>
            </div>
            <ul className='max-h-[420px] divide-y divide-border/60 overflow-y-auto'>
                {rows.map((row, i) => (
                    <Row key={row.barangay_id} rank={i + 1} row={row} max={max} />
                ))}
            </ul>
        </PanelCard>
    )
}

export default HotspotLeaderboard
