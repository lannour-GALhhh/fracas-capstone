import ErrorState from '@/common/components/ErrorState'
import { Skeleton } from '@/common/ui/skeleton'
import type { GisJobKind } from '../types/gisImport'
import { useGisImports } from '../hooks/useGisImports'
import ImportHistory from './components/ImportHistory'
import DetectStreetsCard from './components/DetectStreetsCard'
import UploadCard from './components/UploadCard'

/** Admin console: load barangay boundaries + flood-susceptibility layers on a deployed server. */
const GisDataPage = () => {
    const { data, isLoading, isError, refetch } = useGisImports()
    const processing = (kind: GisJobKind) =>
        !!data?.some((j) => j.kind === kind && (j.status === 'pending' || j.status === 'running'))
    const busy = !!data?.some((j) => j.status === 'pending' || j.status === 'running')

    return (
        <div className='w-full'>
            <h1 className='text-2xl font-semibold'>GIS data</h1>
            <p className='text-xs text-black/50'>
                Upload as .zip. Import boundaries first, then the susceptibility layer, then detect the high-risk streets. Maps update when processing finishes.
            </p>

            <div className='mt-4 grid gap-4 sm:grid-cols-2'>
                <UploadCard
                    kind='boundary'
                    processing={processing('boundary')}
                    title='1. Barangay boundaries'
                    description='Zipped shapefile / GeoPackage / GeoJSON with adm4_pcode, adm4_name (and adm3_pcode = PH0907332). Re-uploading updates in place.'
                    disabled={busy}
                />
                <UploadCard
                    kind='susceptibility'
                    processing={processing('susceptibility')}
                    title='2. Flood susceptibility'
                    description='Zipped ZAM_FLOOD shapefile (.shp, .shx, .dbf, .prj) with susc_level and Flood fields. Replaces all existing zones.'
                    disabled={busy}
                />
                <div className='sm:col-span-2'>
                    <DetectStreetsCard processing={processing('streets')} disabled={busy} />
                </div>
                <div className='sm:col-span-2'>
                    {isLoading && <Skeleton className='h-32' />}
                    {isError && <ErrorState message="Couldn't load imports." onRetry={() => refetch()} />}
                    {data && <ImportHistory jobs={data} />}
                </div>
            </div>
        </div>
    )
}

export default GisDataPage
