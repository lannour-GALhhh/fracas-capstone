import { format } from 'date-fns'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/common/ui/dialog'
import { Badge } from '@/common/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/common/ui/table'
import { usePoiLogs } from './usePoi'
import type { PoiAction, PoiLog } from './types'

const ACTION_TONE: Record<PoiAction, string> = {
    created: 'border-emerald-500/40 text-emerald-600',
    updated: 'border-blue-500/40 text-blue-600',
    moved: 'border-amber-500/40 text-amber-600',
    deleted: 'border-red-500/40 text-red-600',
}

/** Human summary of the "what" for a log row. */
const summarize = (log: PoiLog): string => {
    if (log.action === 'moved') return 'Relocated'
    const changed = (log.detail?.changed ?? {}) as Record<string, [unknown, unknown]>
    const fields = Object.keys(changed)
    if (log.action === 'updated' && fields.length) return `Changed ${fields.join(', ')}`
    if (log.action === 'created') return 'Added'
    if (log.action === 'deleted') return 'Removed'
    return '—'
}

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const PoiLogDialog = ({ open, onOpenChange }: Props) => {
    const { data, isLoading } = usePoiLogs(undefined, open)
    const rows = data?.results ?? []

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='max-w-2xl'>
                <DialogHeader>
                    <DialogTitle>Map edit history</DialogTitle>
                    <DialogDescription>
                        Every evacuation-center edit — when, where and what.
                    </DialogDescription>
                </DialogHeader>

                <div className='max-h-[60vh] overflow-y-auto'>
                    {isLoading ? (
                        <p className='text-muted-foreground p-4 text-sm'>Loading…</p>
                    ) : rows.length === 0 ? (
                        <p className='text-muted-foreground p-4 text-sm'>No edits recorded yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>When</TableHead>
                                    <TableHead>Editor</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>POI</TableHead>
                                    <TableHead>What</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className='whitespace-nowrap text-xs'>
                                            {format(new Date(log.created_at), 'LLL d, HH:mm')}
                                        </TableCell>
                                        <TableCell className='text-xs'>
                                            {log.editor_name || log.editor_username || 'System'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant='outline' className={ACTION_TONE[log.action]}>
                                                {log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className='text-xs'>
                                            <span className='font-medium'>{log.name}</span>
                                            <span className='text-muted-foreground'> · {log.poi_type}</span>
                                        </TableCell>
                                        <TableCell className='text-xs'>{summarize(log)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default PoiLogDialog
