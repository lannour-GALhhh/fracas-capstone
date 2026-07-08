import type { AdminUserFilters } from '../types/user'

/** Centralized query keys for the admin feature. */
export const adminKeys = {
    users: (filters: AdminUserFilters) => ['admin', 'users', filters] as const,
    user: (id: number) => ['admin', 'users', 'detail', id] as const,
    userChanges: (id: number, page: number) => ['admin', 'users', id, 'changes', page] as const,
    riskConfigs: () => ['admin', 'risk-configs'] as const,
    validationRuns: (page: number) => ['admin', 'validation-runs', page] as const,
    validationRun: (id: number) => ['admin', 'validation-runs', 'detail', id] as const,
}
