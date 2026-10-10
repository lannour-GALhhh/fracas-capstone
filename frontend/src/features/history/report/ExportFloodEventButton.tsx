import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/common/ui/button'
import { useCurrentUser } from '@/features/user/hooks/useCurrentUser'
import { getFloodEventReports } from '../api/floodEventsApi'
import type { FloodEventDetail } from '../types/api'

/** Builds and downloads the PDF incident report for one flood event. */
const ExportFloodEventButton = ({ event }: { event: FloodEventDetail }) => {
    const [busy, setBusy] = useState(false)
    const { data: me } = useCurrentUser()

    const handleExport = async () => {
        setBusy(true)
        try {
            const [reports, { buildFloodEventReport }, { format }] = await Promise.all([
                getFloodEventReports(event.id),
                import('./buildFloodEventReport'),
                import('date-fns'),
            ])
            const generatedAt = new Date()
            const preparedBy = me
                ? `${me.first_name} ${me.last_name}`.trim() || me.username
                : 'Operator'
            const doc = buildFloodEventReport({
                event,
                evidence: reports.results,
                preparedBy,
                generatedAt,
            })
            doc.save(`flood-report-${event.id}-${format(generatedAt, 'yyyyMMdd')}.pdf`)
        } catch {
            toast.error('Couldn’t generate the report. Please try again.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <Button
            size='sm'
            variant='outline'
            className='cursor-pointer'
            disabled={busy}
            onClick={handleExport}
        >
            <FileDown className='size-4' />
            {busy ? 'Preparing…' : 'Export PDF'}
        </Button>
    )
}

export default ExportFloodEventButton
