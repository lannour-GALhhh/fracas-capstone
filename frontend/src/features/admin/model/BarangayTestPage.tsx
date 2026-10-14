import { useBarangayTest } from '../hooks/useBarangayTest'
import BarangayTestForm from './components/BarangayTestForm'
import BarangayTestResult from './components/BarangayTestResult'

/** Admin console: check whether the model flags one barangay's flood in time, from an uploaded rainfall CSV. */
const BarangayTestPage = () => {
    const test = useBarangayTest()

    return (
        <div className='w-full'>
            <h1 className='text-2xl font-semibold'>Barangay test</h1>
            <p className='text-xs text-black/50'>
                Upload hourly rainfall for one barangay and mark when the flood was declared. The test passes if the
                active model reaches the chosen level at the mark or within the hours before it. Nothing is saved.
            </p>

            <div className='mt-4 grid gap-6'>
                <BarangayTestForm onSubmit={(input) => test.mutate(input)} pending={test.isPending} />
                {test.data && <BarangayTestResult data={test.data} />}
            </div>
        </div>
    )
}

export default BarangayTestPage
