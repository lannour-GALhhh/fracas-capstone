import { Layers, Waves } from 'lucide-react'
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

/** The hazard-zone color toggles (names for the icon-only control in the toolbar). */
const TOGGLES: { key: ZoneColorMode; label: string; icon: typeof Layers }[] = [
    { key: 'susceptibility', label: 'Susceptibility', icon: Layers },
    { key: 'risk', label: 'Flood risk', icon: Waves },
]

const Swatch = ({ color, label }: { color: string; label: string }) => (
    <span className='flex items-center gap-2'>
        <div
            className='aspect-square w-2 rounded-full ring-1 ring-foreground/10'
            style={{ backgroundColor: color }}
        />
        <h5 className='text-muted-foreground text-xs font-medium'>{label}</h5>
    </span>
)

/** Map key; mirrors the active hazard-zone view. */
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

        <Separator />

        <div className='flex flex-col gap-1'>
            <h5 className='font-medium'>Toggles</h5>
            {TOGGLES.map(({ key, label, icon: Icon }) => {
                const active = view === key
                return (
                    <span key={key} className='flex items-center gap-2'>
                        <Icon
                            className='size-3.5 shrink-0'
                            style={{ opacity: active ? 1 : 0.4 }}
                        />
                        <h5
                            className={`text-xs font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}
                        >
                            {label}
                            {active ? ' ·' : ''}
                        </h5>
                    </span>
                )
            })}
        </div>
    </Card>
)

export default Legend
