import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/common/ui/button'
import { Input } from '@/common/ui/input'
import { Label } from '@/common/ui/label'
import { Checkbox } from '@/common/ui/checkbox'

export interface CenterFormValues {
    name: string
    capacity: string
    contact: string
    is_active: boolean
}

interface Props {
    initial: CenterFormValues
    saving: boolean
    onSubmit: (values: CenterFormValues) => void
    onCancel: () => void
    onDelete?: () => void
}

/** Compact evacuation-center form rendered inside a map popup. */
const CenterPopupForm = ({ initial, saving, onSubmit, onCancel, onDelete }: Props) => {
    const [values, setValues] = useState<CenterFormValues>(initial)
    const set = (patch: Partial<CenterFormValues>) => setValues((v) => ({ ...v, ...patch }))

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
                    placeholder='Evacuation center name'
                    className='h-8'
                    required
                />
            </div>
            <div className='flex gap-2'>
                <div className='flex flex-1 flex-col gap-1'>
                    <Label className='text-xs'>Capacity</Label>
                    <Input
                        type='number'
                        min={0}
                        value={values.capacity}
                        onChange={(e) => set({ capacity: e.target.value })}
                        className='h-8'
                    />
                </div>
                <div className='flex flex-1 flex-col gap-1'>
                    <Label className='text-xs'>Contact</Label>
                    <Input
                        value={values.contact}
                        onChange={(e) => set({ contact: e.target.value })}
                        className='h-8'
                    />
                </div>
            </div>
            <Label className='flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs font-normal'>
                <Checkbox
                    checked={values.is_active}
                    onCheckedChange={(checked) => set({ is_active: checked === true })}
                />
                Active center
            </Label>
            <div className='flex items-center gap-2'>
                <Button type='submit' size='sm' className='flex-1' disabled={saving || !values.name.trim()}>
                    {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button type='button' size='sm' variant='ghost' onClick={onCancel}>
                    Cancel
                </Button>
                {onDelete && (
                    <Button type='button' size='sm' variant='ghost' onClick={onDelete} aria-label='Delete'>
                        <Trash2 className='size-4 text-destructive' />
                    </Button>
                )}
            </div>
        </form>
    )
}

export default CenterPopupForm
