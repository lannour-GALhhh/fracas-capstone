import { ChevronDown, Search, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/common/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/common/ui/select'
import BarangayMultiSelect from '@/features/history/component/BarangayMultiSelect'
import { Button } from '@/common/ui/button'
import { cn } from '@/common/utils/utils'
import { Input } from '@/common/ui/input'
import { EMPTY_FILTERS, isFiltered, type CenterFilterState, type StatusFilter } from './centerFilters'

const STATUS_LABELS: Record<StatusFilter, string> = {
    all: 'All statuses',
    active: 'Active',
    inactive: 'Inactive',
}

interface Props {
    value: CenterFilterState
    onChange: (next: CenterFilterState) => void
    barangays: { id: number; name: string }[]
}

const CenterFilters = ({ value, onChange, barangays }: Props) => {
    const { minCapacity: lo, maxCapacity: hi } = value
    const capacityLabel =
        lo || hi ? (lo && hi ? `${lo} – ${hi}` : lo ? `≥ ${lo}` : `≤ ${hi}`) : null
    const set = (patch: Partial<CenterFilterState>) => onChange({ ...value, ...patch })

    return (
        <div className='mt-4 flex flex-wrap items-center gap-2'>
            <div className='relative min-w-48 flex-1 sm:max-w-xs'>
                <Search className='text-muted-foreground absolute top-2.5 left-2.5 size-4' />
                <Input
                    value={value.search}
                    onChange={(e) => set({ search: e.target.value })}
                    placeholder='Search by name…'
                    aria-label='Search by name'
                    className='pl-8'
                />
            </div>

            <BarangayMultiSelect
                options={barangays}
                value={value.barangay}
                onConfirm={(ids) => set({ barangay: ids })}
            />

            <Popover>
                <PopoverTrigger
                    render={
                        <Button
                            variant='outline'
                            className={cn(
                                'justify-between font-normal',
                                !capacityLabel && 'text-black/50',
                            )}
                        >
                            {capacityLabel ?? 'Any capacity'}
                            <ChevronDown className='size-4 shrink-0 opacity-50' />
                        </Button>
                    }
                />
                <PopoverContent className='w-64 p-2' align='start'>
                    <div className='flex items-center gap-1'>
                        <Input
                            type='number'
                            min={0}
                            autoFocus
                            value={value.minCapacity}
                            onChange={(e) => set({ minCapacity: e.target.value })}
                            placeholder='Min'
                            aria-label='Minimum capacity'
                        />
                        <span className='text-muted-foreground'>–</span>
                        <Input
                            type='number'
                            min={0}
                            value={value.maxCapacity}
                            onChange={(e) => set({ maxCapacity: e.target.value })}
                            placeholder='Max'
                            aria-label='Maximum capacity'
                        />
                    </div>
                </PopoverContent>
            </Popover>

            <Select value={value.status} onValueChange={(v) => set({ status: v as StatusFilter })}>
                <SelectTrigger className='w-40'>
                    <SelectValue>{(v) => STATUS_LABELS[v as StatusFilter]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                            {label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {isFiltered(value) && (
                <Button variant='ghost' size='sm' onClick={() => onChange(EMPTY_FILTERS)}>
                    <X className='size-4' />
                    Clear
                </Button>
            )}
        </div>
    )
}

export default CenterFilters
