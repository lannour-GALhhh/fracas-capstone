import { format } from 'date-fns'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
    drawFooters,
    drawHeading,
    drawLetterhead,
    drawSignatures,
    pdfMetaStyle,
    pdfTableStyle,
    referenceNo,
} from '@/common/utils/pdf/officialDocument'
import { SEVERITY_LABELS } from '../constants/floodEvents'
import type { FloodEvent, FloodSeverity } from '../types/api'

export interface FloodHistoryReportInput {
    events: FloodEvent[]
    /** Human-readable description of the applied filters, one per line. */
    filters: string[]
    preparedBy: string
    generatedAt: Date
}

const DASH = '—'
const SEVERITIES: FloodSeverity[] = ['major', 'moderate', 'minor']

const sum = (values: (number | null)[]) => values.reduce<number>((n, v) => n + (v ?? 0), 0)

const hoursBetween = (e: FloodEvent) =>
    e.ended_at ? (new Date(e.ended_at).getTime() - new Date(e.occurred_at).getTime()) / 36e5 : null

const duration = (e: FloodEvent) => {
    const h = hoursBetween(e)
    return h == null ? DASH : `${h.toFixed(1)} hrs`
}

const count = (n: number | null) => (n == null ? DASH : n.toLocaleString())

/** Builds the official-format flood history report (confirmed events, landscape). */
export const buildFloodHistoryReport = (input: FloodHistoryReportInput): jsPDF => {
    const { events, filters, preparedBy, generatedAt } = input
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
    const refNo = referenceNo('FH', generatedAt)

    const startY = drawLetterhead(doc, 'FLOOD HISTORY REPORT')
    autoTable(doc, {
        ...pdfMetaStyle,
        startY,
        body: [
            ['Reference No.', refNo],
            ['Date Generated', format(generatedAt, 'MMMM d, yyyy, h:mm a')],
            ['Prepared By', preparedBy],
            [
                'Records Covered',
                `Confirmed flood events${filters.length ? `; ${filters.join('; ')}` : ''}`,
            ],
        ],
    })

    // I. Summary
    const durations = events.map(hoursBetween).filter((h): h is number => h != null)
    const depths = events.map((e) => e.water_depth_m).filter((d): d is number => d != null)
    const resolved = events.filter((e) => e.is_resolved).length
    autoTable(doc, {
        ...pdfTableStyle,
        startY: drawHeading(doc, 'I. SUMMARY'),
        body: [
            ['Total flood events', String(events.length)],
            ...SEVERITIES.map((s) => [
                `  ${SEVERITY_LABELS[s]}`,
                String(events.filter((e) => e.severity === s).length),
            ]),
            ['Resolved events', String(resolved)],
            ['Ongoing events', String(events.length - resolved)],
            ['Total persons affected', sum(events.map((e) => e.people_affected)).toLocaleString()],
            ['Total persons evacuated', sum(events.map((e) => e.people_evacuated)).toLocaleString()],
            [
                'Average duration (resolved events with recorded recession)',
                durations.length
                    ? `${(durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)} hours`
                    : DASH,
            ],
            ['Maximum recorded flood depth', depths.length ? `${Math.max(...depths)} ft` : DASH],
        ],
        columnStyles: { 1: { halign: 'right', cellWidth: 40 } },
        tableWidth: 160,
    })

    // II. Records
    const num = { halign: 'right' as const }
    autoTable(doc, {
        ...pdfTableStyle,
        startY: drawHeading(doc, 'II. FLOOD EVENT RECORDS'),
        showHead: 'everyPage',
        head: [
            [
                'No.',
                'Date of Onset',
                'Barangay',
                'Severity',
                'Duration',
                'Depth (ft)',
                'Peak Rain (mm/hr)',
                'Affected',
                'Evacuated',
                'Status',
            ],
        ],
        body: events.length
            ? events.map((e, i) => [
                  String(i + 1),
                  format(new Date(e.occurred_at), 'MMM d, yyyy h:mm a'),
                  e.barangay_name,
                  SEVERITY_LABELS[e.severity],
                  duration(e),
                  e.water_depth_m != null ? String(e.water_depth_m) : DASH,
                  e.peak_rainfall_mm_hr != null ? String(e.peak_rainfall_mm_hr) : DASH,
                  count(e.people_affected),
                  count(e.people_evacuated),
                  e.is_resolved ? 'Resolved' : 'Ongoing',
              ])
            : [[{ content: 'No confirmed flood events match the stated criteria.', colSpan: 10, styles: { halign: 'center' as const } }]],
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            4: num,
            5: num,
            6: num,
            7: num,
            8: num,
        },
    })

    drawSignatures(doc, preparedBy)
    drawFooters(doc, refNo)
    return doc
}
