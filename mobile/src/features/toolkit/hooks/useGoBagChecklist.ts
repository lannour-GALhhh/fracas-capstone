import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

/** AsyncStorage key for the persisted go-bag ticks. Bump only on a breaking shape change. */
const STORAGE_KEY = 'fracas.toolkit.gobag.v1'

/** Map of item id → ticked. Absent ids are unticked. */
type Checked = Record<string, boolean>

interface GoBagChecklist {
    /** Ticked state by item id. */
    checked: Checked
    /** How many items are ticked (for the progress readout). */
    doneCount: number
    /** True once the persisted state has loaded (avoids a flash of empty ticks). */
    ready: boolean
    /** Toggle one item and write through to storage. */
    toggle: (id: string) => void
    /** Clear every tick. */
    reset: () => void
}

/**
 * Persisted go-bag checklist state. Ticks survive app restarts and work fully
 * offline (AsyncStorage, same store the query cache uses). Write-through on every
 * toggle keeps storage in step without a debounce — toggles are rare and cheap.
 */
export function useGoBagChecklist(): GoBagChecklist {
    const [checked, setChecked] = useState<Checked>({})
    const [ready, setReady] = useState(false)

    useEffect(() => {
        let active = true
        AsyncStorage.getItem(STORAGE_KEY)
            .then((raw) => {
                if (active && raw) setChecked(JSON.parse(raw) as Checked)
            })
            .catch(() => undefined)
            .finally(() => {
                if (active) setReady(true)
            })
        return () => {
            active = false
        }
    }, [])

    const toggle = useCallback((id: string) => {
        setChecked((prev) => {
            const next = { ...prev, [id]: !prev[id] }
            void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined)
            return next
        })
    }, [])

    const reset = useCallback(() => {
        setChecked({})
        void AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined)
    }, [])

    const doneCount = Object.values(checked).filter(Boolean).length

    return { checked, doneCount, ready, toggle, reset }
}
