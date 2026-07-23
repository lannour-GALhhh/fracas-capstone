import { Card } from '@/common/ui/card'
import { CATEGORY_LABELS, RISK_COLORS } from '../constants/risk'
import type { RiskCategory } from '../types/api'
import { LAYERS } from '../constants/layers'
import { Separator } from '@/common/ui/separator'
import {
    SUSCEPTIBILITY_COLORS,
    SUSCEPTIBILITY_LABELS,
    SUSCEPTIBILITY_ORDER,
    type ZoneColorMode,
} from '../constants/susceptibility'

// Low → critical, so the swatch column reads as a white→red ramp.
const RISK_ORDER: RiskCategory[] = ['low', 'medium', 'high', 'critical']

const Swatch = ({ color, label }: { color: string; label: string }) => (
    <span className='flex items-center gap-2'>
        <div
            className='aspect-square w-2 rounded-full ring-1 ring-foreground/10'
            style={{ backgroundColor: color }}
        />
        <h5 className='text-muted-foreground text-xs font-medium'>{label}</h5>
    </span>
)

/** Map key. The first section mirrors the active hazard-zone view (set by the
 * dashboard's Susceptibility / Flood-risk toggle). */
const Legend = ({ view }: { view: ZoneColorMode }) => (
    <Card size='sm' className='flex w-44 flex-col gap-2 px-2'>
        <div className='flex flex-col gap-1'>
            {view === 'susceptibility' ? (
                <>
                    <h5 className='font-medium'>Flood susceptibility</h5>
                    {/* Least → most severe, top to bottom. */}
                    {[...SUSCEPTIBILITY_ORDER].reverse().map((level) => (
                        <Swatch
                            key={level}
                            color={SUSCEPTIBILITY_COLORS[level]}
                            label={SUSCEPTIBILITY_LABELS[level]}
                        />
                    ))}
                </>
            ) : (
                <>
                    <h5 className='font-medium'>Flood risk</h5>
                    {RISK_ORDER.map((category) => (
                        <Swatch
                            key={category}
                            color={RISK_COLORS[category]}
                            label={CATEGORY_LABELS[category]}
                        />
                    ))}
                </>
            )}
            <p className='text-muted-foreground mt-0.5 text-[10px] leading-tight'>
                {view === 'susceptibility'
                    ? 'Zones by hazard class. Barangay tint = average risk.'
                    : 'Zones & barangays by current flood risk.'}
            </p>
        </div>

        <Separator />

        <div className='flex flex-col gap-1'>
            <h5 className='font-medium'>Map layers</h5>
            {LAYERS.map(({ key, label, icon: Icon, color }) => (
                <span key={key} className='flex items-center gap-2'>
                    <Icon className='size-3.5 shrink-0' style={{ color }} />
                    <h5 className='text-muted-foreground text-xs font-medium'>{label}</h5>
                </span>
            ))}
        </div>
    </Card>
)

export default Legend
