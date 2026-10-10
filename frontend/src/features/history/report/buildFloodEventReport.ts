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
import { CATEGORY_LABELS } from '@/features/gis/constants/risk'
import { SEVERITY_LABELS, SOURCE_KIND_LABELS, SOURCE_TYPE_LABELS } from '../constants/floodEvents'
import type { FloodEventDetail, FloodEventReport } from '../types/api'

export interface FloodEventReportInput {
    event: FloodEventDetail
    evidence: FloodEventReport[]
    preparedBy: string
    generatedAt: Date
}

const DASH = '—'
const stamp = (iso: string) => format(new Date(iso), 'MMMM d, yyyy, h:mm a')
const num = (v: number | null, unit: string) => (v == null ? DASH : `${v.toLocaleString()} ${unit}`)

/** Who reported the event, as one readable string. */
const reportedBy = (e: FloodEventDetail) => {
    const who = e.source_type === 'operator' ? e.reported_by_name : e.source
    return `${SOURCE_TYPE_LABELS[e.source_type]}${who ? ` — ${who}` : ''}`
}

/** Builds the official-format incident report for one flood event. */
export const buildFloodEventReport = (input: FloodEventReportInput): jsPDF => {
    const { event, evidence, preparedBy, generatedAt } = input
    const { telemetry } = event
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const refNo = referenceNo(`FH-${String(event.id).padStart(4, '0')}`, generatedAt)

    const startY = drawLetterhead(doc, 'FLOOD INCIDENT REPORT')

    autoTable(doc, {
        ...pdfMetaStyle,
        startY,
        body: [
            ['Reference No.', refNo],
            ['Event ID', `#${event.id}`],
            ['Date Generated', format(generatedAt, 'MMMM d, yyyy, h:mm a')],
            ['Prepared By', preparedBy],
        ],
    })

    // I. Incident details
    autoTable(doc, {
        ...pdfTableStyle,
        startY: drawHeading(doc, 'I. INCIDENT DETAILS'),
        theme: 'grid',
        body: [
            ['Barangay', event.barangay_name],
            ['Date and time of onset', stamp(event.occurred_at)],
            [
                'Date and time of recession',
                event.ended_at ? stamp(event.ended_at) : 'Ongoing / not recorded',
            ],
            [
                'Duration',
                event.duration_hours != null ? `${event.duration_hours.toFixed(1)} hours` : DASH,
            ],
            ['Severity', SEVERITY_LABELS[event.severity]],
            ['Maximum flood depth', num(event.water_depth_m, 'ft')],
            ['Reported by', reportedBy(event)],
            [
                'Record status',
                event.is_confirmed
                    ? `Confirmed${event.confirmed_by_name ? ` by ${event.confirmed_by_name}` : ''}${event.confirmed_at ? ` on ${stamp(event.confirmed_at)}` : ''}`
                    : `Unconfirmed (${SOURCE_KIND_LABELS[event.source_kind]})`,
            ],
        ],
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55, fillColor: [245, 245, 245] } },
    })

    // II. Affected population
    autoTable(doc, {
        ...pdfTableStyle,
        startY: drawHeading(doc, 'II. AFFECTED POPULATION'),
        body: [
            ['Persons affected', num(event.people_affected, 'persons')],
            ['Persons evacuated', num(event.people_evacuated, 'persons')],
        ],
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55, fillColor: [245, 245, 245] } },
    })

    // III. Recorded conditions
    const rain = telemetry.rainfall
    const risk = telemetry.risk
    autoTable(doc, {
        ...pdfTableStyle,
        startY: drawHeading(doc, 'III. RECORDED CONDITIONS'),
        body: [
            [
                'Peak rainfall intensity',
                event.peak_rainfall_mm_hr != null
                    ? `${event.peak_rainfall_mm_hr} mm/hr (as recorded)`
                    : rain
                      ? `${rain.peak_intensity} mm/hr (system reading)`
                      : 'No reading in window',
            ],
            [
                'Peak 24-hour accumulation',
                rain ? `${rain.peak_accumulation_24hr} mm` : 'No reading in window',
            ],
            [
                'Peak computed hazard',
                risk
                    ? `${Math.round(risk.peak_score)} / 100 (${CATEGORY_LABELS[risk.category]})`
                    : 'No score in window',
            ],
            [
                'Coordinates (lon, lat)',
                `${telemetry.location[0].toFixed(4)}, ${telemetry.location[1].toFixed(4)}`,
            ],
            ['Telemetry window', `${telemetry.window_hours} hours around the event`],
        ],
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55, fillColor: [245, 245, 245] } },
    })

    // IV. Narrative
    autoTable(doc, {
        ...pdfTableStyle,
        startY: drawHeading(doc, 'IV. SUMMARY OF EVENTS'),
        body: [[event.summary || event.notes || 'No summary recorded.']],
        styles: { ...pdfTableStyle.styles, fontSize: 10, cellPadding: 3, halign: 'justify' },
    })

    // V. Timeline
    autoTable(doc, {
        ...pdfTableStyle,
        startY: drawHeading(doc, 'V. RESPONSE TIMELINE'),
        head: [['Date and Time', 'Action', 'Details']],
        body: event.timeline.length
            ? event.timeline.map((t) => [
                  format(new Date(t.occurred_at), 'MMM d, yyyy h:mm a'),
                  t.title,
                  t.description || DASH,
              ])
            : [[{ content: 'No timeline recorded.', colSpan: 3, styles: { halign: 'center' as const } }]],
        columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 50 } },
    })

    // VI. Evidence
    autoTable(doc, {
        ...pdfTableStyle,
        startY: drawHeading(doc, 'VI. EVIDENCE REPORTS'),
        head: [['No.', 'Date and Time', 'Reported By', 'Description', 'Photos']],
        body: evidence.length
            ? evidence.map((r, i) => [
                  String(i + 1),
                  format(new Date(r.occurred_at), 'MMM d, yyyy h:mm a'),
                  r.reporter_name ?? DASH,
                  r.description,
                  String(r.images.length),
              ])
            : [[{ content: 'No evidence reports attached.', colSpan: 5, styles: { halign: 'center' as const } }]],
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 34 },
            2: { cellWidth: 32 },
            4: { halign: 'center', cellWidth: 14 },
        },
    })

    drawSignatures(doc, preparedBy)
    drawFooters(doc, refNo)
    return doc
}
