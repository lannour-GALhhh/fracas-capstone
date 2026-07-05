import { StyleSheet, Text } from 'react-native'

interface Props {
    /** Emoji glyph for the tab. Swap for a vector-icon set in a later pass. */
    glyph: string
    focused: boolean
}

/** Minimal tab glyph. Dims when the tab is inactive. */
export function TabBarIcon({ glyph, focused }: Props) {
    return <Text style={[styles.glyph, !focused && styles.inactive]}>{glyph}</Text>
}

const styles = StyleSheet.create({
    glyph: { fontSize: 20 },
    inactive: { opacity: 0.4 },
})
