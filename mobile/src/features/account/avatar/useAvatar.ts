import { useCallback, useSyncExternalStore } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { getAvatar, type AvatarOption } from './avatars'

/** Device-local only: the choice is never sent to the server. */
const KEY = 'fracas.account.avatar.v1'

let current: string | null = null
let loaded = false
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((l) => l())

function load() {
    if (loaded) return
    loaded = true
    AsyncStorage.getItem(KEY)
        .then((v) => {
            if (v) {
                current = v
                emit()
            }
        })
        .catch(() => undefined)
}

function subscribe(l: () => void) {
    load()
    listeners.add(l)
    return () => listeners.delete(l)
}

/** The resident's chosen avatar (undefined = none → default icon) and a setter. Shared across screens. */
export function useAvatar(): { avatar: AvatarOption | undefined; setAvatar: (id: string) => void } {
    const id = useSyncExternalStore(subscribe, () => current)
    const setAvatar = useCallback((next: string) => {
        current = next
        emit()
        AsyncStorage.setItem(KEY, next).catch(() => undefined)
    }, [])
    return { avatar: getAvatar(id), setAvatar }
}
