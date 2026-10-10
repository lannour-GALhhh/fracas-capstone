import { Checkbox } from '@/common/ui/checkbox'
import { CATEGORY_LABELS, RISK_TEXT_COLORS } from '@/features/gis/constants/risk'
import { SUSCEPTIBILITY_COLORS, SUSCEPTIBILITY_LABELS } from '@/features/gis/constants/susceptibility'
import type { SusceptibilityLevel } from '@/features/gis/types/api'
import type { ZoneRow } from '../utils/zones'

interface Props {
    rows: ZoneRow[]
    selected: SusceptibilityLevel[]
    onChange: (levels: SusceptibilityLevel[]) => void
}

/** Pick which of a barangay's flood zones to evacuate, each shown with its live score. */
const ZonePicker = ({ rows, selected, onChange }: Props) => {
    if (rows.length === 0) {
        return <p className='text-muted-foreground text-sm'>No zone scores available yet.</p>
    }

    // Rows run most → least susceptible. Checking a zone also checks every more
    // susceptible one above it; unchecking drops it and everything below.
    const toggle = (index: number, on: boolean) =>
        onChange(rows.slice(0, on ? index + 1 : index).map((r) => r.level))

    return (
        <div className='rounded-lg border'>
            <div className='text-muted-foreground flex items-center justify-between border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide'>
                <span>Zone</span>
                <span>Flood risk</span>
            </div>
            <ul className='divide-y'>
                {rows.map((r, i) => (
                    <li key={r.level}>
                        <label className='flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm'>
                            <Checkbox
                                checked={selected.includes(r.level)}
                                onCheckedChange={(on) => toggle(i, on)}
                            />
                            <span
                                className='size-3 rounded-full'
                                style={{ background: SUSCEPTIBILITY_COLORS[r.level] }}
                            />
                            <span className='flex-1 font-medium'>
                                {SUSCEPTIBILITY_LABELS[r.level]} susceptibility
                            </span>
                            <span className='font-medium' style={{ color: RISK_TEXT_COLORS[r.category] }}>
                                {CATEGORY_LABELS[r.category]} · {Math.round(r.score)}
                            </span>
                        </label>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default ZonePicker
