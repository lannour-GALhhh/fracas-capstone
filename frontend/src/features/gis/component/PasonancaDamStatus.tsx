import React, { useState } from 'react'
import { Card } from '@/common/ui/card'
import { Progress, ProgressLabel } from '@/common/ui/progress'
import { Label } from '@/common/ui/label'
import type { PasonancaDamType } from '../types/PasonancaDamType'

const PasonancaDamStatus = ({
    currentLevel,
    criticalLevel,
    rateOfChange
}: PasonancaDamType) => {

    const [isExpanded, setExpanded] = useState<boolean>(false);

    const handleExpanded = (): void => {
        setExpanded(e => !e)
    }

    const percentage = currentLevel / criticalLevel;

    return (
        <Card className='col-span-2 cursor-pointer px-4' onClick={handleExpanded}>
            <h5 className='font-semibold text-black/50'>PASONANCA DAM STATUS</h5>
            <Progress value={percentage*100}>
                <ProgressLabel className='font-bold'>Current Level: {percentage*100}% Capacity</ProgressLabel>
            </Progress>


            {isExpanded &&
                <div className='grid grid-cols-2 grid-flow-col-dense'>
                    <div className='flex flex-col gap-1'>
                        <Label>Current Dam Level</Label>
                        <h4 className='text-xl font-semibold'>{currentLevel}/{criticalLevel} Meters</h4>
                    </div>
                    
                    <div className='flex flex-col gap-1'>
                        <Label>Rate of Change</Label>
                        <h4 className='text-xl font-semibold'>{rateOfChange}</h4>
                    </div>
                </div>
            }
        </Card>
    )
}

export default PasonancaDamStatus