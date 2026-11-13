import { Dices } from 'lucide-react'
import { Button } from '@/common/ui/button'
import { cn } from '@/common/utils/utils'
import { RAINFALL_TIER_LABELS, rainfallTier } from '@/features/gis/constants/rainfall'
import type { SimulationMode, SimulationParams } from '../types/simulation'

interface Props {
    params: SimulationParams
    onChange: (patch: Partial<SimulationParams>) => void
}

const MODES: { value: SimulationMode; label: string }[] = [
    { value: 'selected', label: 'Selected' },
    { value: 'cluster', label: 'Random cluster' },
]

const Slider = ({
    label,
    value,
    min,
    max,
    step = 1,
    format,
    onChange,
}: {
    label: string
    value: number
    min: number
    max: number
    step?: number
    format: (v: number) => string
    onChange: (v: number) => void
}) => (
    <label className='flex min-w-0 flex-col gap-1'>
        <span className='flex justify-between gap-2 text-xs'>
            <span className='font-medium'>{label}</span>
            <span className='truncate text-muted-foreground'>{format(value)}</span>
        </span>
        <input
            type='range'
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className='accent-primary'
        />
    </label>
)

/** Scenario inputs laid out as a compact row for the dashboard's bottom bar. */
const SimulationControls = ({ params, onChange }: Props) => (
    <div className='grid grid-cols-2 gap-x-5 gap-y-3 lg:grid-cols-4'>
        <div className='flex flex-col gap-1.5'>
            <div role='radiogroup' aria-label='Barangay selection' className='grid grid-cols-2 gap-1'>
                {MODES.map(({ value, label }) => (
                    <button
                        key={value}
                        type='button'
                        role='radio'
                        aria-checked={params.mode === value}
                        onClick={() => onChange({ mode: value })}
                        className={cn(
                            'rounded-md border px-2 py-1 text-xs font-medium transition-colors',
                            params.mode === value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>
            {params.mode === 'cluster' ? (
                <div className='flex items-end gap-2'>
                    <div className='flex-1'>
                        <Slider
                            label='Cluster size'
                            value={params.clusterSize}
                            min={2}
                            max={30}
                            format={(v) => `${v}`}
                            onChange={(clusterSize) => onChange({ clusterSize })}
                        />
                    </div>
                    <Button
                        size='icon'
                        variant='outline'
                        aria-label='Randomize cluster'
                        title='Randomize cluster'
                        onClick={() => onChange({ epicenterId: null, seed: params.seed + 1 })}
                    >
                        <Dices />
                    </Button>
                </div>
            ) : (
                <Button
                    size='xs'
                    variant='outline'
                    className='self-start'
                    disabled={params.selectedIds.length === 0}
                    onClick={() => onChange({ selectedIds: [] })}
                >
                    Clear selection
                </Button>
            )}
        </div>

        <Slider
            label='Peak rainfall'
            value={params.peakMmHr}
            min={1}
            max={100}
            format={(v) => `${v} mm/hr · ${RAINFALL_TIER_LABELS[rainfallTier(v)]}`}
            onChange={(peakMmHr) => onChange({ peakMmHr })}
        />
        <Slider
            label='Storm length'
            value={params.durationHours}
            min={1}
            max={24}
            format={(v) => `${v} h`}
            onChange={(durationHours) => onChange({ durationHours })}
        />
        <div className='flex items-end gap-2'>
            <div className='flex-1'>
                <Slider
                    label='Variation'
                    value={params.variation}
                    min={0}
                    max={0.8}
                    step={0.05}
                    format={(v) => `±${Math.round(v * 100)}%`}
                    onChange={(variation) => onChange({ variation })}
                />
            </div>
            <Button
                size='icon'
                variant='outline'
                aria-label='Re-roll variation'
                title='Re-roll variation'
                disabled={params.variation === 0}
                onClick={() => onChange({ seed: params.seed + 1 })}
            >
                <Dices />
            </Button>
        </div>
    </div>
)

export default SimulationControls
