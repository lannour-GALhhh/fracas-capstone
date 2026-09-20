import { useMemo, useState } from 'react'
import type { SettingsByGroup, SettingsGroup } from '../types/settings'
import { useUpdateSettings } from './useSettings'

/** Local form state for one settings group; `save` PATCHes the whole form. */
export function useSettingsForm<G extends SettingsGroup>(group: G, initial: SettingsByGroup[G]) {
    const [form, setForm] = useState<SettingsByGroup[G]>(initial)
    const update = useUpdateSettings(group)

    const setField = <K extends keyof SettingsByGroup[G]>(key: K, value: SettingsByGroup[G][K]) =>
        setForm((prev) => ({ ...prev, [key]: value }))

    const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial])

    return {
        form,
        setField,
        dirty,
        saving: update.isPending,
        save: () => update.mutate(form),
    }
}
