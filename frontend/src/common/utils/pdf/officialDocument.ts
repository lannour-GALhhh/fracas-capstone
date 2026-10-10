import { format } from 'date-fns'
import type { jsPDF } from 'jspdf'

/** Shared look for FRACAS PDF reports: plain, black-and-white, government-document style. */
export const PDF_MARGIN = 20
export const PDF_FONT = 'times'

/** autoTable options common to every report table. */
export const pdfTableStyle = {
    theme: 'grid' as const,
    styles: {
        font: PDF_FONT,
        fontSize: 9,
        textColor: 0,
        lineColor: 120,
        lineWidth: 0.2,
        cellPadding: 1.8,
        valign: 'top' as const,
    },
    headStyles: {
        fillColor: [235, 235, 235] as [number, number, number],
        textColor: 0,
        fontStyle: 'bold' as const,
        halign: 'center' as const,
    },
    margin: { left: PDF_MARGIN, right: PDF_MARGIN, bottom: 22 },
}

/** Options for the borderless label/value block under the title. */
export const pdfMetaStyle = {
    ...pdfTableStyle,
    theme: 'plain' as const,
    styles: {
        ...pdfTableStyle.styles,
        lineWidth: 0,
        cellPadding: { top: 0.8, bottom: 0.8, left: 0, right: 2 },
    },
    columnStyles: { 0: { fontStyle: 'bold' as const, cellWidth: 36 } },
}

/** Letterhead + document title; returns the y position to continue from. */
export const drawLetterhead = (doc: jsPDF, title: string): number => {
    const pageW = doc.internal.pageSize.getWidth()
    const c = pageW / 2
    doc.setTextColor(0)
    doc.setFont(PDF_FONT, 'normal')
    doc.setFontSize(10)
    doc.text('Republic of the Philippines', c, 18, { align: 'center' })
    doc.setFont(PDF_FONT, 'bold')
    doc.setFontSize(12)
    doc.text('CITY OF ZAMBOANGA', c, 24, { align: 'center' })
    doc.setFont(PDF_FONT, 'normal')
    doc.setFontSize(10)
    doc.text('Flood Risk Early Warning System (FRACAS)', c, 29.5, { align: 'center' })
    doc.setLineWidth(0.6)
    doc.line(PDF_MARGIN, 33, pageW - PDF_MARGIN, 33)
    doc.setLineWidth(0.15)
    doc.line(PDF_MARGIN, 34, pageW - PDF_MARGIN, 34)
    doc.setFont(PDF_FONT, 'bold')
    doc.setFontSize(14)
    doc.text(title, c, 44, { align: 'center' })
    return 50
}

/** Section heading below the last table; returns the y to start the next block at. */
export const drawHeading = (doc: jsPDF, text: string): number => {
    const pageH = doc.internal.pageSize.getHeight()
    let y = lastTableBottom(doc) + 9
    // Keep a heading with at least a few rows of its table; otherwise start a new page.
    if (y > pageH - 55) {
        doc.addPage()
        y = 25
    }
    doc.setFont(PDF_FONT, 'bold')
    doc.setFontSize(11)
    doc.setTextColor(0)
    doc.text(text, PDF_MARGIN, y)
    return y + 3
}

/** Bottom edge of the most recent autoTable. */
export const lastTableBottom = (doc: jsPDF): number =>
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

/** "Prepared by / Noted by" block, moved to a fresh page if it would not fit. */
export const drawSignatures = (doc: jsPDF, preparedBy: string): void => {
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const c = pageW / 2
    let y = lastTableBottom(doc) + 14
    if (y + 30 > pageH - 22) {
        doc.addPage()
        y = 30
    }
    doc.setFont(PDF_FONT, 'normal')
    doc.setFontSize(10)
    doc.text('Prepared by:', PDF_MARGIN, y)
    doc.text('Noted by:', c + 5, y)
    const line = y + 16
    doc.setLineWidth(0.2)
    doc.line(PDF_MARGIN, line, PDF_MARGIN + 70, line)
    doc.line(c + 5, line, c + 75, line)
    doc.setFont(PDF_FONT, 'bold')
    doc.text(preparedBy, PDF_MARGIN, line + 5)
    doc.setFont(PDF_FONT, 'normal')
    doc.text('Operator', PDF_MARGIN, line + 10)
    doc.text('Signature over printed name / Position', c + 5, line + 5)
}

/** Reference line + "Page x of y" on every page. Call last. */
export const drawFooters = (doc: jsPDF, refNo: string): void => {
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const pages = doc.getNumberOfPages()
    for (let p = 1; p <= pages; p++) {
        doc.setPage(p)
        doc.setLineWidth(0.15)
        doc.line(PDF_MARGIN, pageH - 16, pageW - PDF_MARGIN, pageH - 16)
        doc.setFont(PDF_FONT, 'normal')
        doc.setFontSize(8)
        doc.text(`${refNo}  |  System-generated report`, PDF_MARGIN, pageH - 11)
        doc.text(`Page ${p} of ${pages}`, pageW - PDF_MARGIN, pageH - 11, { align: 'right' })
    }
}

/** Reference number stamped on a report, e.g. `FH-0042-20261010-1009`. */
export const referenceNo = (prefix: string, generatedAt: Date): string =>
    `${prefix}-${format(generatedAt, 'yyyyMMdd-HHmm')}`
