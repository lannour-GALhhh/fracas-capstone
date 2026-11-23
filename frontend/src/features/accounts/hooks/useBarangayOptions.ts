import { useMemo } from 'react'
import { useBarangays } from '@/features/gis/hooks/useBarangays'

/** Barangays as sorted {id, name} options for pickers. */
export const useBarangayOptions = () => {
    const { data } = useBarangays()
    return useMemo(
        () =>
            (data?.features ?? [])
                .map((f) => ({ id: f.properties.id, name: f.properties.name }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        [data],
    )
}
