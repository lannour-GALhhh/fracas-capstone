import { Layers, Waves } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/common/ui/tooltip'
import { Button } from '@/common/ui/button'
import type { ZoneColorMode } from '../constants/susceptibility'

interface Props {
    value: ZoneColorMode
    onChange: (mode: ZoneColorMode) => void
}

const OPTIONS: { key: ZoneColorMode; label: string; icon: typeof Layers }[] = [
    { key: 'susceptibility', label: 'Susceptibility', icon: Layers },
    { key: 'risk', label: 'Flood risk', icon: Waves },
]

/** Flips the hazard-zone fill between susceptibility class and computed risk. */
const MapViewToggle = ({ value, onChange }: Props) => (
    <>
        {OPTIONS.map(({ key, label, icon: Icon }) => {
            const active = value === key
            return (
                <Tooltip key={key}>
                    <TooltipTrigger
                        render={
                            <Button
                                type='button'
                                onClick={() => onChange(key)}
                                aria-label={label}
                                aria-pressed={active}
                                variant='ghost'
                                className='relative flex size-8 items-center justify-center rounded-full transition-colors cursor-pointer'
                            >
                                <Icon className='size-4' opacity={active ? 1 : 0.4} />
                                {active && (
                                    <span className='bg-primary absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full' />
                                )}
                            </Button>
                        }
                    />
                    <TooltipContent>{`Color by ${label.toLowerCase()}`}</TooltipContent>
                </Tooltip>
            )
        })}
    </>
)

export default MapViewToggle
