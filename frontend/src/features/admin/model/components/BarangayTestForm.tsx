import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/common/ui/button'
import { DateTimePicker } from '@/common/ui/datetime-picker'
import { Input } from '@/common/ui/input'
import { Label } from '@/common/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/common/ui/select'
import { Switch } from '@/common/ui/switch'
import capitalize from '@/common/utils/capitalize'
import { useBarangays } from '@/features/gis/hooks/useBarangays'
import type { BarangayTestInput, TestAggregation } from '../../types/barangayTest'

const AGGREGATIONS: { value: TestAggregation; label: string }[] = [
    { value: '', label: 'Active config' },
    { value: 'max', label: 'Worst zone (max)' },
    { value: 'area_weighted', label: 'Area-weighted' },
    { value: 'mean', label: 'Simple mean' },
]

interface Props {
    onSubmit: (input: BarangayTestInput) => void
    pending: boolean
}

/** Barangay + CSV + flood mark + pass rule. Blank flood time = read the CSV's marker column. */
const BarangayTestForm = ({ onSubmit, pending }: Props) => {
    const { data } = useBarangays()
    const barangays = useMemo(
        () =>
            (data?.features ?? [])
                .map((f) => f.properties)
                .sort((a, b) => a.name.localeCompare(b.name)),
        [data],
    )
    const [barangay, setBarangay] = useState<number | null>(null)
    const [file, setFile] = useState<File | null>(null)
    const [floodAt, setFloodAt] = useState('')
    const [hoursBefore, setHoursBefore] = useState(4)
    const [hoursAfter, setHoursAfter] = useState(0)
    const [minCategory, setMinCategory] = useState<BarangayTestInput['minCategory']>('high')
    const [aggregation, setAggregation] = useState<TestAggregation>('')
    const [lookahead, setLookahead] = useState(false)

    const submit = (e: FormEvent) => {
        e.preventDefault()
        if (barangay === null || !file) return
        onSubmit({
            barangay,
            file,
            floodAt,
            hoursBefore,
            hoursAfter,
            minCategory,
            aggregation,
            forecastLookahead: lookahead,
        })
    }

    return (
        <form onSubmit={submit} className='grid gap-4 rounded-lg border border-border p-4 md:grid-cols-2'>
            <div className='grid gap-1.5'>
                <Label htmlFor='bt-barangay'>Barangay</Label>
                <Select value={barangay === null ? '' : String(barangay)} onValueChange={(v) => setBarangay(Number(v))}>
                    <SelectTrigger id='bt-barangay' className='w-full'>
                        <SelectValue placeholder='Select a barangay'>
                            {(v) => barangays.find((b) => String(b.id) === v)?.name ?? 'Select a barangay'}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {barangays.map((b) => (
                            <SelectItem key={b.id} value={String(b.id)}>
                                {b.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className='grid gap-1.5'>
                <Label htmlFor='bt-file'>Hourly rainfall CSV</Label>
                <Input id='bt-file' type='file' accept='.csv,text/csv' onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <p className='text-xs text-black/50'>
                    Columns: <code>datetime</code>, <code>precipitation_mm</code>, and optionally a marker column{' '}
                    <code>flood</code> (1 on the hour the flood was declared). Hourly, no gaps, max 2000 rows.
                </p>
            </div>

            <div className='grid gap-1.5'>
                <Label>Flood declared at</Label>
                <DateTimePicker value={floodAt} onChange={setFloodAt} />
                <p className='text-xs text-black/50'>Leave blank to use the CSV's marker column.</p>
            </div>

            <div className='grid grid-cols-2 gap-3'>
                <div className='grid gap-1.5'>
                    <Label htmlFor='bt-before'>Hours before the mark</Label>
                    <Input id='bt-before' type='number' min={0} max={48} value={hoursBefore} onChange={(e) => setHoursBefore(Number(e.target.value))} />
                </div>
                <div className='grid gap-1.5'>
                    <Label htmlFor='bt-after'>Hours after the mark</Label>
                    <Input id='bt-after' type='number' min={0} max={48} value={hoursAfter} onChange={(e) => setHoursAfter(Number(e.target.value))} />
                </div>
            </div>

            <div className='grid gap-1.5'>
                <Label htmlFor='bt-cat'>Counts as detected at</Label>
                <Select value={minCategory} onValueChange={(v) => setMinCategory(v as BarangayTestInput['minCategory'])}>
                    <SelectTrigger id='bt-cat' className='w-full'>
                        <SelectValue>{(v) => `${capitalize(v as string)} or above`}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value='medium'>Medium or above</SelectItem>
                        <SelectItem value='high'>High or above</SelectItem>
                        <SelectItem value='critical'>Critical</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className='grid gap-1.5'>
                <Label htmlFor='bt-agg'>Zone scoring</Label>
                <Select value={aggregation} onValueChange={(v) => setAggregation(v as TestAggregation)}>
                    <SelectTrigger id='bt-agg' className='w-full'>
                        <SelectValue>{(v) => AGGREGATIONS.find((a) => a.value === v)?.label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {AGGREGATIONS.map((a) => (
                            <SelectItem key={a.value} value={a.value}>
                                {a.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className='flex items-start gap-3 md:col-span-2'>
                <Switch checked={lookahead} onCheckedChange={setLookahead} id='bt-look' />
                <Label htmlFor='bt-look' className='block text-sm font-normal leading-snug'>
                    Let the engine see the next 4 hours of rain (a perfect forecast).
                    <span className='block text-xs text-black/50'>
                        Off by default: each hour is scored only from rain that has already fallen. Turning it on
                        makes detection look better than it would be live.
                    </span>
                </Label>
            </div>

            <div className='md:col-span-2'>
                <Button type='submit' disabled={pending || barangay === null || !file}>
                    {pending ? 'Running…' : 'Run test'}
                </Button>
            </div>
        </form>
    )
}

export default BarangayTestForm
