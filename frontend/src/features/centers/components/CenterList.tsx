import type { Feature, Point } from 'geojson'
import { useEvacuationCenters } from '@/features/gis/poi/usePoi'
import type { EvacuationProperties } from '@/features/gis/poi/types'
import CenterCard from './CenterCard'

type EvacFeature = Feature<Point, EvacuationProperties>

/** Grid of center cards: one wide card per row, two per row on large screens. */
const CenterList = () => {
    const { data, isLoading, isError } = useEvacuationCenters()
    const centers = (data?.features ?? []) as EvacFeature[]

    if (isLoading) return <p className='text-muted-foreground mt-6 text-sm'>Loading…</p>
    if (isError)
        return <p className='text-destructive mt-6 text-sm'>Couldn't load evacuation centers.</p>
    if (centers.length === 0)
        return <p className='text-muted-foreground mt-6 text-sm'>No evacuation centers yet.</p>

    return (
        <div className='mt-6 grid grid-cols-1 gap-4 2xl:grid-cols-2'>
            {centers.map((c) => (
                <CenterCard key={c.properties.id} center={c} />
            ))}
        </div>
    )
}

export default CenterList
