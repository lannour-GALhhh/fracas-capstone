import { RAINFALL_TIER_ICONS, RAINFALL_TIER_LABELS, rainfallTier } from '../constants/rainfall'

interface Props {
    /** Current rainfall reading, mm/hr. `null`/`undefined` reads as "no data". */
    mmPerHour: number | null | undefined
    /** Badge diameter utility classes. */
    className?: string
}

/** Purple badge whose glyph escalates with rainfall intensity (PAGASA bands). */
const RainfallIcon = ({ mmPerHour, className = 'size-7' }: Props) => {
    const tier = rainfallTier(mmPerHour)
    const Icon = RAINFALL_TIER_ICONS[tier]

    return (
        <div
            className={`flex shrink-0 items-center justify-center rounded-full bg-purple-600 text-white shadow-sm ${className}`}
            title={RAINFALL_TIER_LABELS[tier]}
        >
            <Icon className='size-[60%]' />
        </div>
    )
}

export default RainfallIcon
