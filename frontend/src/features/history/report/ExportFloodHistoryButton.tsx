import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/common/ui/button'
import { useCurrentUser } from '@/features/user/hooks/useCurrentUser'
import { getAllFloodEvents } from '../api/floodEventsApi'
import type { FloodEventFilters } from '../types/api'

interface Props {
    filters: Omit<FloodEventFilters, 'page' | 'archived' | 'confirmed'>
    /** Readable description of the applied filters, printed on the report. */
    filterLabels: string[]
}

/** Fetches every confirmed event matching the filters, then downloads the PDF report. */
const ExportFloodHistoryButton = ({ filters, filterLabels }: Props) => {
    const [busy, setBusy] = useState(false)
    const { data: me } = useCurrentUser()

    const handleExport = async () => {
        setBusy(true)
        try {
            const [events, { buildFloodHistoryReport }, { format }] = await Promise.all([
                getAllFloodEvents({ ...filters, confirmed: true }),
                import('./buildFloodHistoryReport'),
                import('date-fns'),
            ])
            const generatedAt = new Date()
            const preparedBy = me
                ? `${me.first_name} ${me.last_name}`.trim() || me.username
                : 'Operator'
            const doc = buildFloodHistoryReport({
                events,
                filters: filterLabels,
                preparedBy,
                generatedAt,
            })
            doc.save(`flood-history-report-${format(generatedAt, 'yyyyMMdd-HHmm')}.pdf`)
        } catch {
            toast.error('Couldn’t generate the report. Please try again.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <Button
            variant='outline'
            size='sm'
            className='cursor-pointer'
            disabled={busy}
            onClick={handleExport}
        >
            <FileDown className='size-4' />
            {busy ? 'Preparing…' : 'Export PDF'}
        </Button>
    )
}

export default ExportFloodHistoryButton
