import { Siren } from 'lucide-react'

interface Props {
    className?: string
}

/** Pulsing siren glyph for inline use (buttons, panel rows). */
export const EvacuationPingIcon = ({ className = 'size-4' }: Props) => (
    <span className='relative inline-flex items-center justify-center'>
        <span className='bg-destructive/40 absolute inline-flex size-full animate-ping rounded-full' />
        <Siren className={`text-destructive relative ${className}`} />
    </span>
)

/** Solid pulsing badge version for map markers. */
export const EvacuationPingBadge = ({ className = 'size-7' }: Props) => (
    <span className='relative inline-flex items-center justify-center'>
        <span className='bg-destructive/40 absolute inline-flex h-full w-full animate-ping rounded-full' />
        <span
            className={`bg-destructive relative inline-flex items-center justify-center rounded-full border-2 border-white text-white shadow-lg ${className}`}
        >
            <Siren className='size-[55%]' />
        </span>
    </span>
)
