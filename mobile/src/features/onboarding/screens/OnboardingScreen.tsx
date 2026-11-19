import { useCallback, useRef, useState } from 'react'
import { FlatList, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { spacing, useTheme } from '@/common/theme'
import { Button } from '@/common/ui'
import { useBackHandler } from '@/common/hooks/useBackHandler'
import { goBack } from '@/common/utils/navigation'

import { Dots } from '../components/Dots'
import { OnboardingSlide } from '../components/OnboardingSlide'
import { ONBOARDING_STEPS } from '../data/steps'
import { markOnboardingSeen } from '../storage'

const LAST = ONBOARDING_STEPS.length - 1

/**
 * The guided tour. Shown once on first sign-in and re-openable any time from
 * Account. Finishing or skipping records completion, then returns to wherever
 * it was opened from (Status when it was the first-run redirect).
 */
export function OnboardingScreen() {
    const theme = useTheme()
    const { width } = useWindowDimensions()
    const listRef = useRef<FlatList>(null)
    const [index, setIndex] = useState(0)

    const goTo = useCallback((i: number) => {
        listRef.current?.scrollToIndex({ index: i, animated: true })
        setIndex(i)
    }, [])

    const finish = useCallback(async () => {
        await markOnboardingSeen()
        goBack('/status')
    }, [])

    const onBack = useCallback(() => {
        if (index === 0) return false
        goTo(index - 1)
        return true
    }, [index, goTo])
    useBackHandler(onBack)

    const onSwipeEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
        setIndex(Math.round(e.nativeEvent.contentOffset.x / width))

    return (
        <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
            <View style={styles.top}>
                {index < LAST ? <Button label="Skip" variant="ghost" onPress={finish} style={styles.skip} /> : null}
            </View>

            <FlatList
                ref={listRef}
                data={ONBOARDING_STEPS}
                keyExtractor={(s) => s.id}
                renderItem={({ item }) => <OnboardingSlide step={item} width={width} />}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onSwipeEnd}
                getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            />

            <View style={styles.footer}>
                <Dots count={ONBOARDING_STEPS.length} index={index} />
                <Button
                    label={index === LAST ? 'Get started' : 'Next'}
                    onPress={index === LAST ? finish : () => goTo(index + 1)}
                />
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    top: { minHeight: 56, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: spacing.lg },
    skip: { minHeight: 40 },
    footer: { padding: spacing.lg, gap: spacing.lg },
})
