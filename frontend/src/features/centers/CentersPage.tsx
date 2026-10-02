import { Plus } from 'lucide-react'
import { Button } from '@/common/ui/button'
import CenterList from './components/CenterList'
import CenterFormDialog from './components/CenterFormDialog'
import ArchiveDialog from './components/ArchiveDialog'

/** Operator console: list, add, edit and archive evacuation centers. */
const CentersPage = () => {
    return (
        <div className='w-full p-4 sm:p-6'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <h1 className='text-2xl font-semibold'>Evacuation centers</h1>
                <div className='flex items-center gap-2'>
                    <CenterFormDialog
                        trigger={
                            <Button size='sm'>
                                <Plus className='size-4' />
                                Add center
                            </Button>
                        }
                    />
                    <ArchiveDialog />
                </div>
            </div>

            <CenterList />
        </div>
    )
}

export default CentersPage
