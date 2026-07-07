import { useState } from 'react'
import { Button } from '@/common/ui/button'
import PoiDeleteButton from './PoiDeleteButton'
import { Input } from '@/common/ui/input'
import { Label } from '@/common/ui/label'
import { Checkbox } from '@/common/ui/checkbox'
import { Textarea } from '@/common/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/common/ui/select'
import type { HotspotSeverity } from './types'

export interface HotspotFormValues {
    name: string
    severity: HotspotSeverity
    radius_m: string
    description: string
    is_active: boolean
}

const SEVERITIES: { value: HotspotSeverity; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
]

const severityLabel = (value: HotspotSeverity): string =>
    SEVERITIES.find((s) => s.value === value)?.label ?? value

interface Props {
    initial: HotspotFormValues
    saving: boolean
    onSubmit: (values: HotspotFormValues) => void
    onCancel: () => void
    onDelete?: () => void
    /** Fires on every edit, so the map can preview radius/severity live. */
    onChange?: (values: HotspotFormValues) => void
}

/** Compact flood-hotspot form rendered inside a map popup. */
const HotspotPopupForm = ({ initial, saving, onSubmit, onCancel, onDelete, onChange }: Props) => {
    const [values, setValues] = useState<HotspotFormValues>(initial)
    const set = (patch: Partial<HotspotFormValues>) => {
        const next = { ...values, ...patch }
        setValues(next)
        onChange?.(next)
    }

    return (
        <form
            className='flex w-full flex-col gap-2'
            onSubmit={(e) => {
                e.preventDefault()
                if (values.name.trim()) onSubmit(values)
            }}
        >
            <div className='flex flex-col gap-1'>
                <Label className='text-xs'>Name</Label>
                <Input
                    autoFocus
                    value={values.name}
                    onChange={(e) => set({ name: e.target.value })}
                    placeholder='e.g. Tumaga River Bend'
                    className='h-8'
                    required
                />
            </div>
            <div className='flex gap-2'>
                <div className='flex flex-1 flex-col gap-1'>
                    <Label className='text-xs'>Severity</Label>
                    <Select value={values.severity} onValueChange={(v) => set({ severity: v as HotspotSeverity })}>
                        <SelectTrigger className='h-8 w-full'>
                            <SelectValue>{(v: HotspotSeverity) => severityLabel(v)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {SEVERITIES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className='flex flex-1 flex-col gap-1'>
                    <Label className='text-xs'>Radius (m)</Label>
                    <Input
                        type='number'
                        min={50}
                        step={50}
                        value={values.radius_m}
                        onChange={(e) => set({ radius_m: e.target.value })}
                        className='h-8'
                    />
                </div>
            </div>
            <div className='flex flex-col gap-1'>
                <Label className='text-xs'>Why it floods</Label>
                <Textarea
                    value={values.description}
                    onChange={(e) => set({ description: e.target.value })}
                    rows={2}
                    className='text-sm'
                />
            </div>
            <Label className='flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs font-normal'>
                <Checkbox
                    checked={values.is_active}
                    onCheckedChange={(checked) => set({ is_active: checked === true })}
                />
                Active hotspot
            </Label>
            <div className='flex items-center gap-2'>
                <Button type='submit' size='sm' className='flex-1' disabled={saving || !values.name.trim()}>
                    {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button type='button' size='sm' variant='ghost' onClick={onCancel}>
                    Cancel
                </Button>
                {onDelete && (
                    <PoiDeleteButton
                        kind='hotspot'
                        name={values.name}
                        saving={saving}
                        onConfirm={onDelete}
                    />
                )}
            </div>
        </form>
    )
}

export default HotspotPopupForm
