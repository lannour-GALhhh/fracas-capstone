import { Image } from 'expo-image'
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { authColors as C } from '../theme/colors'

/** Sparse decorative "rain" strokes scattered across the hero — minimal lines, not drop shapes. */
const RAINDROPS: {
    top: `${number}%`
    left: `${number}%`
    height: number
    rotate: string
    opacity: number
}[] = [
    { top: '18%', left: '14%', height: 16, rotate: '12deg', opacity: 0.3 },
    { top: '30%', left: '84%', height: 20, rotate: '10deg', opacity: 0.22 },
    { top: '64%', left: '22%', height: 14, rotate: '15deg', opacity: 0.18 },
    { top: '72%', left: '70%', height: 18, rotate: '8deg', opacity: 0.25 },
    { top: '48%', left: '50%', height: 12, rotate: '14deg', opacity: 0.15 },
]

interface Props {
    /** Fraction of screen height the hero occupies (login: 0.4, wizard steps: smaller). */
    heightRatio?: number
    title?: string
}

/** Blue branded banner shared by the login and registration screens. */
export function AuthHero({ heightRatio = 0.4, title = 'FRACAS' }: Props) {
    const { height } = useWindowDimensions()
    const heroHeight = Math.round(height * heightRatio)

    return (
        <View style={[styles.hero, { height: heroHeight }]}>
            <View style={styles.circleTopRight} pointerEvents="none" />
            <View style={styles.circleBottom} pointerEvents="none" />
            {RAINDROPS.map((drop, i) => (
                <View
                    key={i}
                    pointerEvents="none"
                    style={[
                        styles.raindrop,
                        {
                            top: drop.top,
                            left: drop.left,
                            height: drop.height,
                            opacity: drop.opacity,
                            transform: [{ rotate: drop.rotate }],
                        },
                    ]}
                />
            ))}
            <Image
                source={require('../../../../assets/images/logo-glow.png')}
                style={styles.image}
                contentFit="contain"
                transition={300}
            />
            <SafeAreaView edges={['top']} style={styles.content}>
                <Text style={styles.title}>{title}</Text>
            </SafeAreaView>
        </View>
    )
}

const styles = StyleSheet.create({
    hero: {
        backgroundColor: C.hero,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    image: {
        position: 'absolute',
        width: '78%',
        height: '78%',
        opacity: 0.9,
    },
    circleTopRight: {
        position: 'absolute',
        top: -55,
        right: -55,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    circleBottom: {
        position: 'absolute',
        bottom: -95,
        left: -55,
        width: 230,
        height: 230,
        borderRadius: 115,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    raindrop: {
        position: 'absolute',
        width: 2,
        borderRadius: 1,
        backgroundColor: '#ffffff',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    title: {
        color: '#ffffff',
        fontSize: 40,
        fontWeight: '800',
        letterSpacing: 1,
    },
})
