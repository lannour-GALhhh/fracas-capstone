import ActiveEvacuationsList from './component/ActiveEvacuationsList'
import EvacuationHistoryTable from './component/EvacuationHistoryTable'

/** Operator console for evacuations: active cards + closed-evacuation history. */
const EvacuationPage = () => (
    <div className='w-full p-4'>
        <h1 className='text-2xl font-semibold'>Evacuations</h1>

        <ActiveEvacuationsList />

        <section className='mt-8'>
            <h2 className='text-sm font-semibold'>Evacuation history</h2>
            <EvacuationHistoryTable />
        </section>
    </div>
)

export default EvacuationPage
