import { useState } from 'react'
import { Card } from '@/common/ui/card'
import { cn } from '@/common/utils/utils'
import { Button } from '@/common/ui/button'
import { Separator } from '@/common/ui/separator'
import capitalize from '@/common/utils/capitalize'
import { RISK_COLORS } from '../constants/risk'
import type { CategoryGroup } from '../hooks/useRiskMap'

interface RiskCardProps {
    group: CategoryGroup
    onSelect: (id: number) => void
}

const RiskCard = ({ group, onSelect }: RiskCardProps) => {
    const { category, barangays } = group
    const [isExpanded, setExpanded] = useState(false)
    const hasBarangays = barangays.length > 0

    const toggle = () => hasBarangays && setExpanded((e) => !e)

    return (
        <Card
            size='sm'
            className={cn(
                'flex-row items-center gap-4 px-4 transition-all',
                hasBarangays && 'cursor-pointer',
                hasBarangays && !isExpanded &&
                    'hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none',
                isExpanded && 'col-span-2',
            )}
            onClick={toggle}
        >
            <div
                className='aspect-square w-2.5 rounded-full ring-1 ring-foreground/10'
                style={{ backgroundColor: RISK_COLORS[category] }}
            />
            <div className='flex flex-1 flex-col items-start gap-1'>
                <h5 className='text-md font-semibold'>{capitalize(category)}</h5>
                <Separator />
                {isExpanded ? (
                    <div className='mt-4 flex w-full flex-col gap-1'>
                        <h5 className='font-semibold'>Affected Barangays:</h5>
                        <div className='flex max-h-64 flex-col gap-2 overflow-y-auto p-1'>
                            {barangays.map((b) => (
                                <Card
                                    key={b.id}
                                    className='flex-row items-center justify-between py-4'
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <h5>{b.name}</h5>
                                    <Button size="sm" variant='outline' className='cursor-pointer' onClick={() => onSelect(b.id)}>
                                        View
                                    </Button>
                                </Card>
                            ))}
                        </div>
                    </div>
                ) : (
                    <h5 className='text-muted-foreground text-sm'>
                        {hasBarangays ? `${barangays.length} barangays` : 'No barangay'}
                    </h5>
                )}
            </div>
        </Card>
    )
}

export default RiskCard
