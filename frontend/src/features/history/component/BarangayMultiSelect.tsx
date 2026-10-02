import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/common/ui/button'
import { Checkbox } from '@/common/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/common/ui/popover'
import { cn } from '@/common/utils/utils'

interface Option {
    id: number
    name: string
}

interface Props {
    options: Option[]
    /** Currently applied barangay ids. */
    value: number[]
    onConfirm: (ids: number[]) => void
    className?: string
    placeholder?: string
}

/** Checklist popover: edits a draft selection, applied only on "Confirm". */
const BarangayMultiSelect = ({ options, value, onConfirm, className, placeholder = 'All barangays' }: Props) => {
    const [open, setOpen] = useState(false)
    const [draft, setDraft] = useState<number[]>(value)

    const label =
        value.length === 0
            ? placeholder
            : value.length === 1
                ? (options.find((o) => o.id === value[0])?.name ?? `Barangay #${value[0]}`)
                : `${value.length} barangays`

    const toggle = (id: number) =>
        setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]))

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                if (next) setDraft(value) // start each session from the applied selection
                setOpen(next)
            }}
        >
            <PopoverTrigger
                render={
                    <Button
                        variant='outline'
                        className={cn(
                            'w-56 justify-between font-normal',
                            className,
                            value.length === 0 && 'text-black/50',
                        )}
                    >
                        <span className='truncate'>{label}</span>
                        <ChevronDown className='size-4 shrink-0 opacity-50' />
                    </Button>
                }
            />
            <PopoverContent className='w-64 gap-2 p-2' align='start'>
                {/* 10 rows × 2rem each */}
                <ul className='max-h-80 overflow-y-auto'>
                    {options.map((o) => (
                        <li key={o.id}>
                            <label className='flex h-8 cursor-pointer items-center gap-2 rounded px-2 text-sm hover:bg-muted'>
                                <Checkbox
                                    checked={draft.includes(o.id)}
                                    onCheckedChange={() => toggle(o.id)}
                                />
                                <span className='truncate'>{o.name}</span>
                            </label>
                        </li>
                    ))}
                </ul>
                <div className='flex items-center justify-between border-t pt-2'>
                    <Button
                        size='sm'
                        variant='ghost'
                        className='cursor-pointer text-black/50'
                        disabled={draft.length === 0}
                        onClick={() => setDraft([])}
                    >
                        Clear selection
                    </Button>
                    <Button
                        size='sm'
                        className='cursor-pointer'
                        onClick={() => {
                            onConfirm(draft)
                            setOpen(false)
                        }}
                    >
                        Confirm
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

export default BarangayMultiSelect
