import { StyleSheet, View } from 'react-native'

import { Icon, Text } from '@/common/ui'

import type { GuidePlacement } from '../utils/guide'

const ARROW = 36
const GUIDE_COLOR = '#059669' // matches the refuge pin

interface Props {
    placement: GuidePlacement
    distanceKm: number
}

/** Arrow toward the nearest evacuation center: beside its pin when visible, else on the map edge. */
export function NearestCenterGuide({ placement, distanceKm }: Props) {
    const { x, y, angle, inView } = placement
    return (
        <View
            pointerEvents="none"
            style={[styles.wrap, { left: x - ARROW / 2, top: y - ARROW / 2 }]}
        >
            <View style={[styles.disc, { transform: [{ rotate: `${angle}deg` }] }]}>
                <Icon name="arrow-up" size={22} color="#ffffff" />
            </View>
            {!inView ? (
                <View style={styles.label}>
                    <Text style={styles.labelText}>{formatKm(distanceKm)}</Text>
                </View>
            ) : null}
        </View>
    )
}

const formatKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`)

const styles = StyleSheet.create({
    wrap: { position: 'absolute', width: ARROW, alignItems: 'center' },
    disc: {
        width: ARROW,
        height: ARROW,
        borderRadius: ARROW / 2,
        backgroundColor: GUIDE_COLOR,
        borderWidth: 2,
        borderColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
    },
    label: {
        marginTop: 2,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 999,
        backgroundColor: GUIDE_COLOR,
    },
    labelText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
})
