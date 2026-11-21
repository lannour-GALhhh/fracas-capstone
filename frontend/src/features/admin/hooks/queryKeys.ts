import type { AdminUserFilters } from '../types/user'
import type { SettingsGroup } from '../types/settings'
import type { SimulationParams } from '../types/simulation'

/** Centralized query keys for the admin feature. */
export const adminKeys = {
    users: (filters: AdminUserFilters) => ['admin', 'users', filters] as const,
    user: (id: number) => ['admin', 'users', 'detail', id] as const,
    userChanges: (id: number, page: number) => ['admin', 'users', id, 'changes', page] as const,
    systemStatus: () => ['admin', 'system', 'status'] as const,
    autoDetect: () => ['admin', 'system', 'auto-detect'] as const,
    riskConfig: () => ['admin', 'system', 'risk-config'] as const,
    gisActive: () => ['admin', 'gis-imports', 'active'] as const,
    gisImports: () => ['admin', 'gis-imports'] as const,
    rainfallGrid: () => ['admin', 'settings', 'rainfall', 'grid'] as const,
    rainfallSimulation: (params: SimulationParams) => ['admin', 'rainfall-simulation', params] as const,
    settings: (group: SettingsGroup) => ['admin', 'settings', group] as const,
}
