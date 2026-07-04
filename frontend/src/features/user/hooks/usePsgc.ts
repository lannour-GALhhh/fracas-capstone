import { useQuery } from '@tanstack/react-query'
import { getBarangays, getCities, getProvinces } from '../api/psgc'

/** PSGC lists are static; cache them for the whole session. */
const STATIC = { staleTime: Infinity, gcTime: Infinity }

/** All provinces. */
export const useProvinces = () =>
    useQuery({ queryKey: ['psgc', 'provinces'], queryFn: getProvinces, ...STATIC })

/** Cities/municipalities under the given province (idle until one is chosen). */
export const useCities = (provinceCode: string) =>
    useQuery({
        queryKey: ['psgc', 'cities', provinceCode],
        queryFn: () => getCities(provinceCode),
        enabled: Boolean(provinceCode),
        ...STATIC,
    })

/** Barangays under the given city/municipality (idle until one is chosen). */
export const usePsgcBarangays = (cityCode: string) =>
    useQuery({
        queryKey: ['psgc', 'barangays', cityCode],
        queryFn: () => getBarangays(cityCode),
        enabled: Boolean(cityCode),
        ...STATIC,
    })
