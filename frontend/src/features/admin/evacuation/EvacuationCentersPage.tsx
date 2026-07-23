import { Plus } from 'lucide-react'
import { Button } from '@/common/ui/button'
import EvacuationTable from './components/EvacuationTable'
import EvacuationFormDialog from './components/EvacuationFormDialog'

/** Admin console: list, add, edit and delete evacuation centers. Centers are
 * read-only on the GIS map; this is where they're managed. */
const EvacuationCentersPage = () => {
    return (
        <div className='w-full'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <div>
                    <h1 className='text-2xl font-semibold'>Evacuation centers</h1>
                    <p className='text-xs text-black/50'>
                        Add, edit and remove centers. Each needs a name and coordinates; capacity
                        and contact are optional.
                    </p>
                </div>
                <EvacuationFormDialog
                    trigger={
                        <Button size='sm'>
                            <Plus className='size-4' />
                            Add center
                        </Button>
                    }
                />
            </div>

            <EvacuationTable />
        </div>
    )
}

export default EvacuationCentersPage
