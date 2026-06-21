import { useState } from 'react'
import { Card } from '@/common/ui/card';
import { cn } from '@/common/utils/utils';
import type { RiskCardType } from '../types/RiskType';
import capitalize from '@/common/utils/capitalize';
import { Button } from '@/common/ui/button';


const RiskCard = ({
    risk,
    barangays
}: RiskCardType) => {

    const [isExpanded, setExpanded] = useState<boolean>(false);

    const toggleExpanded = (): void => {if (barangays) setExpanded(e => !e)};

    const barangaysList = barangays?.map(({name, link}, index) => 
        <Card size='sm' className='flex-row items-center justify-between px-2' key={index} onClick={(e) => e.stopPropagation()} >
            <h5>{name}</h5>
            <Button variant="outline" className="cursor-pointer" onClick={() => console.log(link)}>View</Button>
        </Card>
    )

    return (
        <Card size='sm' className={cn('flex-row gap-4 items-center px-4 cursor-pointer transition-all', 
            isExpanded && "col-span-2"
        )} onClick={() => toggleExpanded()}>
            <div className={cn('w-2.5 aspect-square rounded-full bg-red-500', 
                risk === "low" && 'bg-green-500',
                risk === "medium" && 'bg-yellow-500',
                risk === "high" && 'bg-orange-500',
            )} />
            <div className='flex flex-1 flex-col gap-1 items-start'>
                <h5 className='font-semibold text-md'>{capitalize(risk)}</h5>
                {isExpanded ?
                    <div className='flex flex-col gap-1 w-full mt-4'>
                        <h5 className='font-semibold'>Affected Barangays:</h5>
                        {barangaysList}
                    </div>
                    :
                    <h5 className='text-sm text-black/50'>{barangays ? <>{barangays.length} barangays</> : <>No barangay</>}</h5>
                }
            </div>
        </Card>
    )
}

export default RiskCard