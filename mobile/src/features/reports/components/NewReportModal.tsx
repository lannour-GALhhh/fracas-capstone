import { Image } from 'expo-image'
import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { radius, spacing, useTheme } from '@/common/theme'
import { Button, Icon, Input, Text, type IconName } from '@/common/ui'
import { apiErrorMessage } from '@/common/utils/apiError'
import { useCurrentLocation } from '@/common/hooks/useCurrentLocation'

import { MAX_PHOTOS } from '../constants'
import { usePhotoPicker } from '../hooks/usePhotoPicker'
import { useSubmitReport } from '../hooks/useSubmitReport'
import { BarangayPickerModal } from './BarangayPickerModal'

interface Props {
    visible: boolean
    onClose: () => void
    onSubmitted: () => void
}

/** Submit a flood photo report: photos + comment + where (GPS or a chosen barangay). */
export function NewReportModal({ visible, onClose, onSubmitted }: Props) {
    const theme = useTheme()
    const insets = useSafeAreaInsets()
    const picker = usePhotoPicker()
    const gps = useCurrentLocation()
    const submit = useSubmitReport()

    const [description, setDescription] = useState('')
    const [barangay, setBarangay] = useState<{ id: number; name: string } | null>(null)
    const [choosing, setChoosing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Default to the device's location whenever the sheet opens.
    const { request: requestGps } = gps
    useEffect(() => {
        if (visible) void requestGps()
    }, [visible, requestGps])

    const located = gps.coords != null || barangay != null
    const canSubmit = picker.photos.length > 0 && located && !submit.isPending

    const reset = () => {
        picker.clear()
        gps.reset()
        setDescription('')
        setBarangay(null)
        setError(null)
    }

    const close = () => {
        reset()
        onClose()
    }

    const pick = async (source: 'camera' | 'gallery') => {
        setError(await (source === 'camera' ? picker.fromCamera() : picker.fromGallery()))
    }

    const useGps = async () => {
        setError(null)
        const fix = await gps.request()
        if (fix) setBarangay(null)
        else setError('Couldn’t get your location. Choose your barangay instead.')
    }

    const send = () => {
        submit.mutate(
            {
                photos: picker.photos,
                description,
                location: gps.coords ? { lat: gps.coords.lat, lng: gps.coords.lng } : null,
                barangayId: gps.coords ? null : (barangay?.id ?? null),
            },
            {
                onSuccess: () => {
                    reset()
                    onSubmitted()
                },
                onError: (e) => setError(apiErrorMessage(e, 'Couldn’t send your report. Please try again.')),
            },
        )
    }

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
            <KeyboardAvoidingView
                style={[styles.sheet, { backgroundColor: theme.colors.bg }]}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                    <Text variant="title">Report flooding</Text>
                    <Button label="Cancel" variant="ghost" onPress={close} style={styles.small} />
                </View>

                <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
                    <View style={styles.section}>
                        <Text variant="label">Photos ({picker.photos.length}/{MAX_PHOTOS})</Text>
                        <View style={styles.row}>
                            <PhotoTile icon="camera-outline" label="Take a photo" onPress={() => pick('camera')} />
                            <PhotoTile icon="images-outline" label="Get from Gallery" onPress={() => pick('gallery')} />
                        </View>
                        {picker.photos.length > 0 ? (
                            <View style={styles.thumbs}>
                                {picker.photos.map((p, i) => (
                                    <View key={p.uri} style={styles.thumb}>
                                        <Image source={{ uri: p.uri }} style={styles.fill} contentFit="cover" />
                                        <Pressable
                                            onPress={() => picker.remove(i)}
                                            hitSlop={6}
                                            accessibilityLabel="Remove photo"
                                            style={styles.remove}
                                        >
                                            <Icon name="close" size={14} color="#fff" />
                                        </Pressable>
                                    </View>
                                ))}
                            </View>
                        ) : null}
                    </View>

                    <View style={[styles.section, styles.divided, { borderTopColor: theme.colors.border }]}>
                        <Text variant="label">Comment</Text>
                        <Input
                            value={description}
                            onChangeText={setDescription}
                            placeholder="What are you seeing? Water depth, affected roads…"
                            multiline
                            style={styles.comment}
                        />
                    </View>

                    <View style={[styles.section, styles.divided, { borderTopColor: theme.colors.border }]}>
                        <Text variant="label">Location</Text>
                        <View style={styles.locationRow}>
                            <Icon name="location-outline" size={18} color={theme.colors.primary} />
                            <Text variant="caption" style={styles.locationText}>
                                {gps.coords
                                    ? 'Using your current location'
                                    : barangay
                                      ? barangay.name
                                      : gps.status === 'requesting'
                                        ? 'Getting your location…'
                                        : 'Location unavailable'}
                            </Text>
                        </View>
                        <Button
                            label="Select barangay"
                            variant="secondary"
                            onPress={() => setChoosing(true)}
                        />
                    </View>

                    {error ? (
                        <Text variant="caption" color="danger">
                            {error}
                        </Text>
                    ) : null}
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
                    <Button
                        label="Send report"
                        onPress={send}
                        disabled={!canSubmit}
                        loading={submit.isPending}
                        labelStyle={styles.sendLabel}
                    />
                </View>
            </KeyboardAvoidingView>

            <BarangayPickerModal
                visible={choosing}
                onClose={() => setChoosing(false)}
                onPick={(b) => {
                    setBarangay(b)
                    gps.reset()
                    setChoosing(false)
                }}
            />
        </Modal>
    )
}

function PhotoTile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
    const theme = useTheme()
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => [
                styles.tile,
                { backgroundColor: theme.colors.surfaceAlt },
                pressed && styles.pressed,
            ]}
        >
            <Icon name={icon} size={44} color={theme.colors.primary} />
            <Text variant="caption" style={styles.tileLabel}>
                {label}
            </Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    sheet: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
    },
    small: { minHeight: 40, paddingHorizontal: spacing.md },
    body: { padding: spacing.lg, gap: spacing.xl },
    section: { gap: spacing.sm },
    row: { flexDirection: 'row', gap: spacing.sm },
    tile: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    pressed: { opacity: 0.6 },
    tileLabel: { textAlign: 'center' },
    divided: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.xl },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    locationText: { flexShrink: 1 },
    sendLabel: { fontSize: 15, lineHeight: 20 },
    thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    thumb: { width: 88, height: 88, borderRadius: radius.md, overflow: 'hidden' },
    fill: { width: '100%', height: '100%' },
    remove: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    comment: { minHeight: 96, textAlignVertical: 'top' },
    footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
})
