import { Plus } from 'lucide-react'
import { Button } from '@/common/ui/button'
import CenterList from './components/CenterList'
import CenterFormDialog from './components/CenterFormDialog'

/** Operator console: list, add, edit and delete evacuation centers. */
const CentersPage = () => {
    return (
        <div className='w-full p-4 sm:p-6'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <h1 className='text-2xl font-semibold'>Evacuation centers</h1>
                <CenterFormDialog
                    trigger={
                        <Button size='sm'>
                            <Plus className='size-4' />
                            Add center
                        </Button>
                    }
                />
            </div>

            <CenterList />
        </div>
    )
}

export default CentersPage
