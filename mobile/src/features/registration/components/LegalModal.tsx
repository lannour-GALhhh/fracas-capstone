import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { radius, spacing, useTheme } from '@/common/theme'
import { Button, Icon, Text } from '@/common/ui'

import type { LegalDocument } from '../types'

interface Props {
    /** The document to show; `null` keeps the sheet closed. */
    document: LegalDocument | null
    accepted: boolean
    onClose: () => void
    /** Tick the matching checkbox and dismiss — the "read it, then agree" path. */
    onAccept: () => void
}

/**
 * Full-height reader for a single legal document. A tall sheet rather than a
 * route so the wizard keeps its half-entered state (the OTP is already typed by
 * the time these are opened), and so accepting can tick the checkbox behind it
 * without a navigation round-trip.
 */
export function LegalModal({ document, accepted, onClose, onAccept }: Props) {
    const { colors } = useTheme()
    // The sheet is bottom-anchored, so its footer would otherwise sit under the
    // gesture bar / home indicator.
    const insets = useSafeAreaInsets()

    return (
        <Modal
            visible={document !== null}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>
                <View
                    style={[
                        styles.sheet,
                        { backgroundColor: colors.bg, borderColor: colors.border },
                    ]}
                >
                    {document ? (
                        <>
                            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                                <View style={styles.headerText}>
                                    <Text variant="subtitle">{document.title}</Text>
                                    <Text variant="caption" color="textMuted">
                                        {document.effective}
                                    </Text>
                                </View>
                                <Pressable
                                    onPress={onClose}
                                    hitSlop={12}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Close ${document.title}`}
                                    style={({ pressed }) => pressed && styles.pressed}
                                >
                                    <Icon name="close" size={24} color={colors.textMuted} />
                                </Pressable>
                            </View>

                            <ScrollView
                                style={styles.scroll}
                                contentContainerStyle={styles.content}
                                showsVerticalScrollIndicator
                            >
                                <Text variant="body" color="textMuted">
                                    {document.intro}
                                </Text>

                                {document.sections.map((section, index) => (
                                    <View key={section.heading} style={styles.section}>
                                        <Text variant="label">
                                            {index + 1}. {section.heading}
                                        </Text>
                                        {section.body?.map((paragraph) => (
                                            <Text key={paragraph} variant="body" color="textMuted">
                                                {paragraph}
                                            </Text>
                                        ))}
                                        {section.bullets?.map((bullet) => (
                                            <View key={bullet} style={styles.bulletRow}>
                                                <Text variant="body" color="textMuted">
                                                    {'•'}
                                                </Text>
                                                <Text
                                                    variant="body"
                                                    color="textMuted"
                                                    style={styles.bulletText}
                                                >
                                                    {bullet}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                ))}

                                <Text variant="caption" color="textMuted" style={styles.end}>
                                    End of {document.title.toLowerCase()}.
                                </Text>
                            </ScrollView>

                            <View
                                style={[
                                    styles.footer,
                                    {
                                        borderTopColor: colors.border,
                                        paddingBottom: Math.max(insets.bottom, spacing.lg),
                                    },
                                ]}
                            >
                                <Button
                                    label="Close"
                                    variant="ghost"
                                    onPress={onClose}
                                    style={styles.action}
                                />
                                <Button
                                    label={accepted ? 'Accepted' : 'I accept'}
                                    onPress={onAccept}
                                    disabled={accepted}
                                    style={styles.action}
                                />
                            </View>
                        </>
                    ) : null}
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: {
        // Stops short of the top so the backdrop stays visible — it reads as a
        // sheet over the wizard rather than a screen the resident navigated to.
        height: '92%',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopLeftRadius: radius.lg,
        borderTopRightRadius: radius.lg,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        padding: spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerText: { flex: 1, gap: spacing.xs },
    pressed: { opacity: 0.5 },
    scroll: { flex: 1 },
    content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
    section: { gap: spacing.sm },
    bulletRow: { flexDirection: 'row', gap: spacing.sm },
    bulletText: { flex: 1 },
    end: { textAlign: 'center', marginTop: spacing.sm },
    footer: {
        flexDirection: 'row',
        gap: spacing.sm,
        padding: spacing.lg,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    action: { flex: 1 },
})
