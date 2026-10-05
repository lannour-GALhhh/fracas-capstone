import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/common/ui/select'
import type { PsgcPlace } from '../api/psgc'

/** A PSGC cascade dropdown (province / city / barangay). */
const PlaceSelect = ({
    id,
    value,
    displayName,
    options,
    loading,
    disabled,
    onSelect,
}: {
    id: string
    value: string
    displayName: string
    options: PsgcPlace[]
    loading: boolean
    disabled?: boolean
    onSelect: (place: PsgcPlace) => void
}) => (
    <Select
        id={id}
        value={value}
        onValueChange={(code) => {
            const place = options.find((o) => o.code === String(code))
            if (place) onSelect(place)
        }}
        disabled={disabled || loading}
    >
        <SelectTrigger className="w-full">
            <SelectValue placeholder={loading ? 'Loading…' : disabled ? '—' : 'Select…'}>
                {displayName}
            </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72" alignItemWithTrigger={false}>
            {options.map((o) => (
                <SelectItem key={o.code} value={o.code}>
                    {o.name}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
)

export default PlaceSelect
