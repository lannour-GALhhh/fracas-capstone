import { StyleSheet, View } from 'react-native'

import { radius, spacing } from '@/common/theme'

import { Text } from './Text'

interface Props {
    label: string
    /** Background color (e.g. a RISK_COLORS entry). Defaults to a neutral surface. */
    color?: string
    /** Text color; default dark for readability on the light risk ramp. */
    textColor?: string
}

/** Small rounded status pill. */
export function Badge({ label, color = '#eceef1', textColor = '#0f1115' }: Props) {
    return (
        <View style={[styles.base, { backgroundColor: color }]}>
            <Text variant="caption" style={{ color: textColor, fontWeight: '600' }}>
                {label}
            </Text>
        </View>
    )
}

const styles = StyleSheet.create({
    base: {
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs / 2,
        borderRadius: radius.pill,
    },
})
