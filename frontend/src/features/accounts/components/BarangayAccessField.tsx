import { Button } from '@/common/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/common/ui/field'
import BarangayMultiSelect from '@/features/history/component/BarangayMultiSelect'
import { useBarangayOptions } from '../hooks/useBarangayOptions'

interface Props {
    /** True = limited to `ids`; false = may act in every barangay. */
    restricted: boolean
    ids: number[]
    onChange: (restricted: boolean, ids: number[]) => void
    error?: string
}

/** Chooses whether an account acts in all barangays or only specific ones. */
const BarangayAccessField = ({ restricted, ids, onChange, error }: Props) => {
    const options = useBarangayOptions()
    return (
        <Field>
            <FieldLabel>Barangay access</FieldLabel>
            <div className='flex gap-2'>
                <Button
                    type='button'
                    variant={restricted ? 'outline' : 'default'}
                    onClick={() => onChange(false, [])}
                >
                    All barangays
                </Button>
                <Button
                    type='button'
                    variant={restricted ? 'default' : 'outline'}
                    onClick={() => onChange(true, ids)}
                >
                    Specific barangays
                </Button>
            </div>
            {restricted && (
                <BarangayMultiSelect
                    options={options}
                    value={ids}
                    placeholder='Select barangays'
                    className='w-full'
                    onConfirm={(next) => onChange(true, next)}
                />
            )}
            <FieldDescription className={error ? 'text-destructive' : undefined}>
                {error ?? 'Restricted accounts can only take actions (alerts, evacuations, flood records, centers) in their assigned barangays.'}
            </FieldDescription>
        </Field>
    )
}

export default BarangayAccessField
