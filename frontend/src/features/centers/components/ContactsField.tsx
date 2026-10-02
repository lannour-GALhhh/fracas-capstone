import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/common/ui/button'
import { Input } from '@/common/ui/input'
import { FieldLabel } from '@/common/ui/field'
import type { EvacuationContact } from '@/features/gis/poi/types'

interface Props {
    value: EvacuationContact[]
    onChange: (next: EvacuationContact[]) => void
}

/** Editable list of contacts (label + phone); add as many as needed. */
const ContactsField = ({ value, onChange }: Props) => {
    const update = (i: number, patch: Partial<EvacuationContact>) =>
        onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))

    return (
        <div className='flex flex-col gap-2'>
            <div className='flex items-center justify-between'>
                <FieldLabel>Contacts</FieldLabel>
                <Button
                    type='button'
                    size='xs'
                    variant='outline'
                    onClick={() => onChange([...value, { label: '', phone: '' }])}
                >
                    <Plus className='size-3.5' />
                    Add contact
                </Button>
            </div>
            {value.map((c, i) => (
                <div key={i} className='flex items-center gap-2'>
                    <Input
                        aria-label={`Contact ${i + 1} name`}
                        className='w-2/5'
                        maxLength={100}
                        placeholder='Name / role'
                        value={c.label}
                        onChange={(e) => update(i, { label: e.target.value })}
                    />
                    <Input
                        aria-label={`Contact ${i + 1} phone`}
                        type='tel'
                        maxLength={50}
                        placeholder='Phone number'
                        value={c.phone}
                        onChange={(e) => update(i, { phone: e.target.value })}
                    />
                    <Button
                        type='button'
                        size='icon'
                        variant='ghost'
                        aria-label='Remove contact'
                        onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                    >
                        <Trash2 className='size-4' />
                    </Button>
                </div>
            ))}
        </div>
    )
}

export default ContactsField
