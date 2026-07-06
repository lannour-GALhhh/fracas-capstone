import { Card } from '@/common/ui/card'
import { CATEGORY_LABELS, RISK_COLORS } from '../constants/risk'
import type { RiskCategory } from '../types/api'
import { LAYERS } from '../constants/layers'

// Low → critical, so the swatch column reads as a white→red ramp.
const ORDER: RiskCategory[] = ['low', 'medium', 'high', 'critical']

const Legend = () => (
    <Card size='sm' className='absolute top-20 left-4 z-2 flex w-40 flex-col gap-2 px-2'>
        <div className='flex flex-col gap-1'>
            <h5 className='font-medium'>Hazard</h5>
            {ORDER.map((category) => (
                <span key={category} className='flex items-center gap-2'>
                    <div
                        className='aspect-square w-2 rounded-full ring-1 ring-foreground/10'
                        style={{ backgroundColor: RISK_COLORS[category] }}
                    />
                    <h5 className='text-muted-foreground text-xs font-medium'>
                        {CATEGORY_LABELS[category]}
                    </h5>
                </span>
            ))}
        </div>

        <div className='flex flex-col gap-1 border-t pt-2'>
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
