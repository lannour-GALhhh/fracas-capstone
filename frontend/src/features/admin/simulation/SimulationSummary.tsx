import { CATEGORY_LABELS, CATEGORY_ORDER, RISK_COLORS } from '@/features/gis/constants/risk'
import type { RiskCategory } from '@/features/gis/types/api'
import type { SimulationBarangayResult } from '../types/simulation'

/** This hour's category tally plus the worst-hit barangays. */
const SimulationSummary = ({ results, hour }: { results: SimulationBarangayResult[]; hour: number }) => {
    const rows = results
        .map((r) => ({ id: r.id, name: r.name, step: r.steps[Math.min(hour, r.steps.length - 1)] }))
        .sort((a, b) => b.step.score - a.step.score)
    const counts = CATEGORY_ORDER.reduce(
        (acc, c) => ({ ...acc, [c]: rows.filter((r) => r.step.category === c).length }),
        {} as Record<RiskCategory, number>,
    )

    return (
        <div className='flex flex-col gap-3'>
            <div className='grid grid-cols-4 gap-2'>
                {CATEGORY_ORDER.map((c) => (
                    <div key={c} className='rounded-md border px-2 py-1.5 text-center'>
                        <div className='text-lg leading-none font-semibold'>{counts[c]}</div>
                        <div className='mt-1 flex items-center justify-center gap-1 text-[11px] text-muted-foreground'>
                            <span className='size-2 rounded-full' style={{ backgroundColor: RISK_COLORS[c] }} />
                            {CATEGORY_LABELS[c]}
                        </div>
                    </div>
                ))}
            </div>
            <ul className='max-h-40 divide-y overflow-y-auto rounded-md border text-xs'>
                {rows.map(({ id, name, step }) => (
                    <li key={id} className='flex items-center justify-between gap-2 px-2 py-1.5'>
                        <span className='truncate font-medium'>{name}</span>
                        <span className='flex shrink-0 items-center gap-2 text-muted-foreground'>
                            {step.rain_mm_hr.toFixed(1)} mm/hr
                            <span
                                className='w-10 rounded px-1 text-center font-medium'
                                style={{
                                    backgroundColor: RISK_COLORS[step.category],
                                    color: step.category === 'low' ? '#3f0a0a' : '#fff',
                                }}
                            >
                                {Math.round(step.score)}
                            </span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default SimulationSummary
