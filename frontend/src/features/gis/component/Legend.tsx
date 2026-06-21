import { Card } from '@/common/ui/card'
import { cn } from '@/common/utils/utils'

type Legend = {
    name: string,
    color: string
}

const Legend = () => {

    const legends: Legend[]  = [
        {name: "Low", color: "bg-green-400"},
        {name: "Medium", color: "bg-yellow-400"},
        {name: "High", color: "bg-orange-400"},
        {name: "Critical", color: "bg-red-400"},
    ]

    const legendList = legends.map(({name, color}, index) =>
        <span key={index} className='flex items-center gap-2'>
            <div className={cn('aspect-square w-2 rounded-full', color)} />
            <h5 className='text-xs font-medium text-black/50'>{name}</h5>
        </span>
    )
    
    return (
        <Card size='sm' className='flex flex-col gap-1 absolute top-4 left-4 z-2 w-1/8 px-2'>
            <h5 className='font-medium'>Legend</h5>
            {legendList}
        </Card>
    )
}

export default Legend