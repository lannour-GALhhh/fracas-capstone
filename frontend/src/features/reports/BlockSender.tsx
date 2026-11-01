import { format } from 'date-fns'
import { Ban, ShieldCheck } from 'lucide-react'
import { Button } from '@/common/ui/button'
import { Checkbox } from '@/common/ui/checkbox'
import { Label } from '@/common/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/common/ui/select'
import { useUnblockReporter } from './hooks'
import type { FloodReport } from './types'

const DURATIONS = [
    { value: '1', label: '1 day' },
    { value: '3', label: '3 days' },
    { value: '7', label: '7 days' },
    { value: '30', label: '30 days' },
    { value: 'permanent', label: 'Permanent' },
] as const

/** "Also block this sender?" checkbox that reveals the duration picker when ticked. */
export const BlockOption = ({
    checked,
    onCheckedChange,
    duration,
    onDurationChange,
}: {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    duration: string
    onDurationChange: (duration: string) => void
}) => (
    <div className='flex flex-col gap-3 rounded-md border p-3'>
        <Label className='cursor-pointer'>
            <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
            Also block the sender from sending reports?
        </Label>
        {checked && (
            <div className='flex flex-col gap-1'>
                <Label>Block duration</Label>
                <Select value={duration} onValueChange={(v) => onDurationChange(v ?? '7')}>
                    <SelectTrigger className='w-full'>
                        <SelectValue>{(v: string | null) => DURATIONS.find((d) => d.value === v)?.label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {DURATIONS.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                                {d.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )}
    </div>
)

/** Shown when the sender is already blocked, with a way to lift it. */
export const BlockedNotice = ({ report, onDone }: { report: FloodReport; onDone: () => void }) => {
    const unblock = useUnblockReporter()
    const current = report.reporter_block
    if (!current) return null
    return (
        <div className='bg-destructive/5 flex items-center justify-between gap-3 rounded-md border p-3 text-sm'>
            <span className='flex items-center gap-2'>
                <Ban className='text-destructive size-4 shrink-0' />
                {current.permanent
                    ? 'Sender is blocked permanently'
                    : `Sender is blocked until ${format(new Date(current.until!), 'LLL d, y')}`}
            </span>
            <Button
                size='sm'
                variant='outline'
                className='cursor-pointer'
                disabled={unblock.isPending}
                onClick={() => unblock.mutate(report.id, { onSuccess: onDone })}
            >
                <ShieldCheck className='size-4' />
                Unblock
            </Button>
        </div>
    )
}
