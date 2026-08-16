import AsyncStorage from '@react-native-async-storage/async-storage'
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react'
import { useColorScheme } from 'react-native'

import { getTheme, type ColorScheme, type Theme } from './theme'

/** AsyncStorage key for the resident's explicit light/dark choice. */
const STORAGE_KEY = 'fracas.theme.scheme.v1'

interface ThemeContextValue {
    theme: Theme
    /** The scheme actually being rendered (an explicit choice, else the device's). */
    scheme: ColorScheme
    /** True while no explicit choice has been made, so the device still decides. */
    followsDevice: boolean
    setScheme: (scheme: ColorScheme) => void
    toggleScheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Holds the active color scheme. Defaults to the device setting and switches to
 * the resident's explicit choice once they flip the drawer toggle; that choice is
 * persisted and survives restarts.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
    const deviceScheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
    // null = never chosen, so follow the device.
    const [override, setOverride] = useState<ColorScheme | null>(null)
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        let active = true
        AsyncStorage.getItem(STORAGE_KEY)
            .then((raw) => {
                if (active && (raw === 'light' || raw === 'dark')) setOverride(raw)
            })
            .catch(() => undefined)
            .finally(() => {
                if (active) setLoaded(true)
            })
        return () => {
            active = false
        }
    }, [])

    const scheme = override ?? deviceScheme

    const setScheme = useCallback((next: ColorScheme) => {
        setOverride(next)
        void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined)
    }, [])

    const value = useMemo<ThemeContextValue>(
        () => ({
            theme: getTheme(scheme),
            scheme,
            followsDevice: override === null,
            setScheme,
            toggleScheme: () => setScheme(scheme === 'dark' ? 'light' : 'dark'),
        }),
        [scheme, override, setScheme],
    )

    // Hold the first paint until the stored choice resolves, so someone who picked
    // dark on a light device never sees a flash of the wrong palette.
    if (!loaded) return null

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/** The active theme (colors + scale tokens). What components read. */
export function useTheme(): Theme {
    return useThemeContext().theme
}

/** Scheme read/write, for the drawer's light–dark switch. */
export function useThemeControls(): ThemeContextValue {
    return useThemeContext()
}

function useThemeContext(): ThemeContextValue {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
    return ctx
}
