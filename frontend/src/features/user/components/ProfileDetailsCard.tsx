import type { ReactNode } from 'react'
import { Mail, MapPin, Phone } from 'lucide-react'
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

const Detail = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
    <div className='flex items-start gap-3'>
        <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground'>
            {icon}
        </span>
        <div className='min-w-0'>
            <p className='text-xs text-muted-foreground'>{label}</p>
            <p className='break-words text-sm font-medium'>{value}</p>
        </div>
    </div>
)

const ProfileDetailsCard = ({ email, phone_number, address }: ProfileDetailsProps) => (
    <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
        <Detail icon={<Mail className='size-4' />} label='Email' value={email} />
        <Detail icon={<Phone className='size-4' />} label='Phone number' value={phone_number} />
        <Detail icon={<MapPin className='size-4' />} label='Address' value={formatAddress(address)} />
    </div>
)

export default ProfileDetailsCard
