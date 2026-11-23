import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg'

import { spacing, useTheme } from '@/common/theme'
import { Text } from '@/common/ui'

import { BAND_COLORS } from '../constants'
import type { ForecastHour } from '../types'
import { dayLabel, hourLabel } from '../utils'

const STEP = 30 // px per hour
const HEIGHT = 180
const PAD = { top: 12, bottom: 28, left: 4, right: 12 }
const AXIS_W = 36
const MIN_TOP = 15 // y-axis never tops out below this (PAGASA orange band), so drizzle stays a small bump

/** Smooth (monotone cubic) path through the points — curvy without overshooting below 0. */
const smoothPath = (pts: { x: number; y: number }[]): string => {
    if (pts.length < 2) return ''
    const n = pts.length
    const dx = pts.slice(1).map((p, i) => p.x - pts[i].x)
    const slope = pts.slice(1).map((p, i) => (p.y - pts[i].y) / dx[i])
    const tan = pts.map((_, i) => {
        if (i === 0) return slope[0]
        if (i === n - 1) return slope[n - 2]
        return slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2
    })
    // Fritsch–Carlson limiter keeps each segment monotone.
    for (let i = 0; i < n - 1; i++) {
        if (slope[i] === 0) {
            tan[i] = 0
            tan[i + 1] = 0
            continue
        }
        const a = tan[i] / slope[i]
        const b = tan[i + 1] / slope[i]
        const h = Math.hypot(a, b)
        if (h > 3) {
            tan[i] = (3 * a * slope[i]) / h
            tan[i + 1] = (3 * b * slope[i]) / h
        }
    }
    let d = `M${pts[0].x},${pts[0].y}`
    for (let i = 0; i < n - 1; i++) {
        const w = dx[i] / 3
        d += ` C${pts[i].x + w},${pts[i].y + tan[i] * w} ${pts[i + 1].x - w},${pts[i + 1].y - tan[i + 1] * w} ${pts[i + 1].x},${pts[i + 1].y}`
    }
    return d
}

interface Props {
    hours: ForecastHour[]
    /** Hours at or below this lead are covered by the risk score; a marker shows where that ends. */
    warningHours: number
}

/** Curved rainfall line with a dot per hour (coloured by PAGASA band). Tap to read an hour. */
export function ForecastChart({ hours, warningHours }: Props) {
    const theme = useTheme()
    const [picked, setPicked] = useState<number | null>(null)

    const { points, top, width, path, boundaryX } = useMemo(() => {
        const maxMm = Math.max(MIN_TOP, ...hours.map((h) => h.mm_hr))
        const top = Math.ceil(maxMm / 5) * 5
        const plotH = HEIGHT - PAD.top - PAD.bottom
        const points = hours.map((h, i) => ({
            x: PAD.left + i * STEP + STEP / 2,
            y: PAD.top + plotH * (1 - h.mm_hr / top),
        }))
        const firstFar = hours.findIndex((h) => h.lead_hours > warningHours)
        return {
            points,
            top,
            width: PAD.left + hours.length * STEP + PAD.right,
            path: smoothPath(points),
            boundaryX: firstFar > 0 ? PAD.left + firstFar * STEP : null,
        }
    }, [hours, warningHours])

    const plotH = HEIGHT - PAD.top - PAD.bottom
    const selected = picked == null ? null : hours[picked]
    const ticks = [0, top / 2, top]

    return (
        <View style={styles.wrap}>
            <Text variant="caption" color="textMuted" style={styles.readout}>
                {selected
                    ? `${dayLabel(selected.start)} ${hourLabel(selected.start)} · ${selected.mm_hr} mm/hr` +
                      (selected.probability != null ? ` · ${selected.probability}% chance` : '')
                    : 'Tap the chart to read an hour'}
            </Text>
            <View style={styles.row}>
                <Svg width={AXIS_W} height={HEIGHT}>
                    {ticks.map((t) => {
                        const y = PAD.top + plotH * (1 - t / top)
                        return (
                            <SvgText key={t} x={AXIS_W - 6} y={y + 4} fontSize={10} fill={theme.colors.textMuted} textAnchor="end">
                                {t}
                            </SvgText>
                        )
                    })}
                </Svg>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Pressable
                        onPress={(e) => {
                            const i = Math.round((e.nativeEvent.locationX - PAD.left - STEP / 2) / STEP)
                            setPicked(Math.min(hours.length - 1, Math.max(0, i)))
                        }}
                        accessibilityRole="image"
                        accessibilityLabel="Hourly rainfall forecast chart"
                    >
                        <Svg width={width} height={HEIGHT}>
                            {ticks.map((t) => {
                                const y = PAD.top + plotH * (1 - t / top)
                                return <Line key={t} x1={0} x2={width} y1={y} y2={y} stroke={theme.colors.border} strokeWidth={1} />
                            })}
                            {boundaryX != null ? (
                                <Line
                                    x1={boundaryX}
                                    x2={boundaryX}
                                    y1={PAD.top}
                                    y2={HEIGHT - PAD.bottom}
                                    stroke={theme.colors.textMuted}
                                    strokeWidth={1}
                                    strokeDasharray="4 3"
                                />
                            ) : null}
                            <Path d={path} stroke={theme.colors.primary} strokeWidth={1.5} fill="none" />
                            {hours.map((h, i) => (
                                <Circle
                                    key={h.start}
                                    cx={points[i].x}
                                    cy={points[i].y}
                                    r={i === picked ? 5.5 : 3.5}
                                    fill={h.band === 'none' ? theme.colors.primary : BAND_COLORS[h.band]}
                                    fillOpacity={h.probability == null ? 1 : 0.35 + 0.65 * (h.probability / 100)}
                                    stroke={theme.colors.bg}
                                    strokeWidth={1}
                                />
                            ))}
                            {hours.map((h, i) =>
                                i % 3 === 0 ? (
                                    <SvgText
                                        key={`t${h.start}`}
                                        x={points[i].x}
                                        y={HEIGHT - 8}
                                        fontSize={10}
                                        fill={theme.colors.textMuted}
                                        textAnchor="middle"
                                    >
                                        {hourLabel(h.start)}
                                    </SvgText>
                                ) : null,
                            )}
                        </Svg>
                    </Pressable>
                </ScrollView>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    wrap: { gap: spacing.sm },
    row: { flexDirection: 'row' },
    readout: { textAlign: 'center' },
})
