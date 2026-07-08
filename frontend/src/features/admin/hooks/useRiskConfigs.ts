import { useQuery } from '@tanstack/react-query'
import { getRiskConfigs } from '../api/modelApi'
import { adminKeys } from './queryKeys'

/** All scoring configs, most recent first (server-ordered). */
export const useRiskConfigs = () =>
    useQuery({
        queryKey: adminKeys.riskConfigs(),
        queryFn: getRiskConfigs,
    })
