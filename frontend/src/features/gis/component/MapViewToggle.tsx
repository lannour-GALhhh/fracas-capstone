import { Layers, Waves } from 'lucide-react'
import { Button } from '@/common/ui/button'
import { ButtonGroup } from '@/common/ui/button-group'
import type { ZoneColorMode } from '../constants/susceptibility'

interface Props {
    value: ZoneColorMode
    onChange: (mode: ZoneColorMode) => void
}

const OPTIONS: { key: ZoneColorMode; label: string; icon: typeof Layers }[] = [
    { key: 'susceptibility', label: 'Susceptibility', icon: Layers },
    { key: 'risk', label: 'Flood risk', icon: Waves },
]

/**
 * Segmented control that flips the hazard-zone fill between the static
 * susceptibility classes (green→red) and the computed flood risk (white→red).
 */
const MapViewToggle = ({ value, onChange }: Props) => (
    <ButtonGroup>
        {OPTIONS.map(({ key, label, icon: Icon }) => {
            const active = value === key
            return (
                <Button
                    key={key}
                    type='button'
                    size='sm'
                    variant={active ? 'default' : 'ghost'}
                    aria-pressed={active}
                    onClick={() => onChange(key)}
                    className='cursor-pointer gap-1.5'
                >
                    <Icon className='size-4' />
                    {label}
                </Button>
            )
        })}
    </ButtonGroup>
)

export default MapViewToggle
