import { Tooltip, TooltipContent, TooltipTrigger } from '@/common/ui/tooltip'
import { LAYERS, type LayerKey, type LayerVisibility } from '../constants/layers'

interface Props {
    layers: LayerVisibility
    onToggle: (key: LayerKey) => void
}

/**
 * Minimal icon-only layer toggles for the top toolbar. An off layer is greyed
 * with a slash struck through its icon; hovering any icon names the layer.
 * Layers still surface their POIs for the focused barangay (handled per layer),
 * so this only governs the city-wide view.
 */
const LayersControl = ({ layers, onToggle }: Props) => (
    <div className='flex items-center gap-0.5'>
        {LAYERS.map(({ key, label, icon: Icon, color }) => {
            const on = layers[key]
            return (
                <Tooltip key={key}>
                    <TooltipTrigger
                        render={
                            <button
                                type='button'
                                onClick={() => onToggle(key)}
                                aria-label={label}
                                aria-pressed={on}
                                className='hover:bg-muted relative flex size-8 items-center justify-center rounded-full transition-colors'
                            >
                                <Icon
                                    className='size-4'
                                    stroke={on ? color : 'currentColor'}
                                    opacity={on ? 1 : 0.45}
                                />
                                {!on && (
                                    <span className='pointer-events-none absolute inset-0 flex items-center justify-center'>
                                        <span className='bg-muted-foreground/70 h-5 w-px rotate-45 rounded-full' />
                                    </span>
                                )}
                            </button>
                        }
                    />
                    <TooltipContent>
                        {on ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                    </TooltipContent>
                </Tooltip>
            )
        })}
    </div>
)

export default LayersControl
