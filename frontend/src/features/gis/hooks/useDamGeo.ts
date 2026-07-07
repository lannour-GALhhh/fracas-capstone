import { useQuery } from '@tanstack/react-query'
import { getDamGeo } from '../api/gisApi'
import { gisKeys } from './queryKeys'

/** Dam point + river geometry. Effectively static, so cache it hard. */
export const useDamGeo = () =>
    useQuery({
        queryKey: gisKeys.damGeo,
        queryFn: getDamGeo,
        staleTime: 60 * 60_000,
    })
