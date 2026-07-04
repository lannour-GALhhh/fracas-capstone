import { Label } from '@/common/ui/label'
import { Separator } from '@/common/ui/separator'
import type { Address } from '../types'

interface ProfileDetailsProps {
    email: string
    phone_number: string
    address: Address
}

/** One-line home address, skipping blank parts (matches the backend order). */
const formatAddress = (a: Address): string => {
    const parts = [a.unit, a.barangay, a.city, a.province, a.zip_code, a.country]
        .map((p) => p.trim())
        .filter(Boolean)
    return parts.length ? parts.join(', ') : '—'
}

const ProfileDetailsCard = ({ email, phone_number, address }: ProfileDetailsProps) => {
    return (
        <div className='flex flex-col gap-4 px-8'>
            <Label className='text-sm text-black/50 -mb-2'>Email</Label>
            <h4>{email}</h4>
            <Separator />
            <Label className='text-sm text-black/50 -mb-2'>Phone Number</Label>
            <h4>{phone_number}</h4>
            <Separator />
            <Label className='text-sm text-black/50 -mb-2'>Address</Label>
            <h4>{formatAddress(address)}</h4>
        </div>
    )
}

export default ProfileDetailsCard
