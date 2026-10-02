import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Feature, Point } from 'geojson'
import { useEvacuationCenters } from '@/features/gis/poi/usePoi'
import type { EvacuationProperties } from '@/features/gis/poi/types'
import { useBarangays } from '@/features/gis/hooks/useBarangays'
import CenterCard from './CenterCard'
import CenterFilters from './CenterFilters'
import { EMPTY_FILTERS, matchesFilters } from './centerFilters'

type EvacFeature = Feature<Point, EvacuationProperties>

/** Grid of center cards: one wide card per row, two per row on large screens. */
const CenterList = () => {
    const { data, isLoading, isError } = useEvacuationCenters()
    const all = useMemo(() => (data?.features ?? []) as EvacFeature[], [data])
    const [filters, setFilters] = useState(EMPTY_FILTERS)
    const { data: barangayData } = useBarangays()
    const barangays = useMemo(
        () =>
            (barangayData?.features ?? [])
                .map((f) => ({ id: f.properties.id, name: f.properties.name }))
                .sort((x, y) => x.name.localeCompare(y.name)),
        [barangayData],
    )
    const centers = useMemo(
        () => all.filter((c) => matchesFilters(c.properties, filters)),
        [all, filters],
    )
    const focusId = Number(useSearchParams()[0].get('center')) || null

    useEffect(() => {
        if (focusId && centers.length)
            document
                .getElementById(`center-${focusId}`)
                ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, [focusId, centers.length])

    if (isLoading) return <p className='text-muted-foreground mt-6 text-sm'>Loading…</p>
    if (isError)
        return <p className='text-destructive mt-6 text-sm'>Couldn't load evacuation centers.</p>
    if (all.length === 0)
        return <p className='text-muted-foreground mt-6 text-sm'>No evacuation centers yet.</p>

    return (
        <>
            <CenterFilters value={filters} onChange={setFilters} barangays={barangays} />
            {centers.length === 0 ? (
                <p className='text-muted-foreground mt-6 text-sm'>
                    No centers match these filters.
                </p>
            ) : (
                <div className='mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-2'>
                    {centers.map((c) => (
                        <CenterCard
                            key={c.properties.id}
                            center={c}
                            highlighted={c.properties.id === focusId}
                        />
                    ))}
                </div>
            )}
        </>
    )
}

export default CenterList
