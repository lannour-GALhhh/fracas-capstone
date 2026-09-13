import type { ComponentType } from 'react'
import { CloudRain, Droplets } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Card } from '@/common/ui/card'
import { Label } from '@/common/ui/label'
import { useBarangayRisk } from '../hooks/useBarangayRisk'

/** Round to at most 2 decimal places without padding trailing zeros. */
const fmtMm = (v: number | null | undefined): string =>
    v == null ? '—' : `${Math.round(v * 100) / 100}`

/** Frontend-only display scale — not used for scoring. 200mm mirrors the
 * backend's `DEFAULT_ACCUMULATION_CURVE` saturation point for 24hr hazard;
 * 400mm is a display-only "heavy week" reference (no backend equivalent
 * exists for the 7-day figure). */
const DAILY_MAX_MM = 200
const WEEKLY_MAX_MM = 400

const AccumulationCard = ({
    icon: Icon,
    title,
    valueMm,
    maxMm,
}: {
    icon: ComponentType<{ className?: string }>
    title: string
    valueMm: number | null | undefined
    maxMm: number
}) => {
    const pct = valueMm == null ? 0 : Math.min(100, Math.max(0, (valueMm / maxMm) * 100))

    return (
        <Card className='gap-2'>
            <div className='flex items-center gap-1.5'>
                <Icon className='text-muted-foreground size-4 shrink-0' />
                <Label className='font-medium'>{title}</Label>
            </div>
            <div className='bg-muted h-4 w-full overflow-hidden rounded-full'>
                <div className='bg-secondary h-full rounded-full' style={{ width: `${pct}%` }} />
            </div>
            <span className='text-xl font-semibold tabular-nums'>
                {fmtMm(valueMm)}
                <span className='text-muted-foreground ml-1 text-xs font-normal'>mm</span>
            </span>
        </Card>
    )
}

interface RainfallAccumulationPanelProps {
    barangayId: number
}

/**
 * Floating companion to `BarangayPanel`, docked at its bottom-left corner —
 * `right` mirrors that panel's own `w-1/4 min-w-80` so the two line up
 * regardless of viewport width (same trick as `HighRiskStreetsPanel`).
 */
const RainfallAccumulationPanel = ({ barangayId }: RainfallAccumulationPanelProps) => {
    const { data } = useBarangayRisk(barangayId)
    const reduce = useReducedMotion()

    return (
        <motion.div
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className='absolute right-[calc(max(25%,20rem)+0.75rem)] bottom-4 z-30 flex w-72 flex-col gap-3'
        >
            <AccumulationCard
                icon={CloudRain}
                title='Daily Rainfall Accumulation'
                valueMm={data?.accumulated_24hr}
                maxMm={DAILY_MAX_MM}
            />
            <AccumulationCard
                icon={Droplets}
                title='Weekly Rainfall Accumulation'
                valueMm={data?.accumulated_7day}
                maxMm={WEEKLY_MAX_MM}
            />
        </motion.div>
    )
}

export default RainfallAccumulationPanel
