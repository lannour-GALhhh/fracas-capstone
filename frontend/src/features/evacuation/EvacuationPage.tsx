import ActiveEvacuationsList from './component/ActiveEvacuationsList'
import EvacuationHistoryTable from './component/EvacuationHistoryTable'

/**
 * Operator console for evacuations, in two stacked sections.
 *
 * **Active** — live cards for every open evacuation, showing aggregate roster
 * progress only (no per-resident list).
 *
 * **History** — the archive of closed evacuations, answered from the counts
 * frozen on each row when it was marked safe (so it survives the retention
 * purge of the per-resident rows).
 */
const EvacuationPage = () => (
    <div className='w-full p-4'>
        <div>
            <h1 className='text-2xl font-semibold'>Evacuations</h1>
            <p className='text-xs text-black/50'>
                Track who has reached safety during an active evacuation, and review how past ones
                ended
            </p>
        </div>

        <ActiveEvacuationsList />

        <section className='mt-8'>
            <div>
                <h2 className='text-sm font-semibold'>Evacuation history</h2>
                <p className='text-xs text-black/50'>
                    Past evacuations and how they ended
                </p>
            </div>
            <EvacuationHistoryTable />
        </section>
    </div>
)

export default EvacuationPage
