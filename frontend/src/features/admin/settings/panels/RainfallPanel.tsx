import { cn } from '@/common/utils/utils'
import { useSettingsForm } from '../../hooks/useSettingsForm'
import type { RainfallSettings, WeatherModel } from '../../types/settings'
import { SettingsSection } from '../components/SettingsSection'
import { SaveBar } from '../components/fields'

const MODELS: { value: WeatherModel; label: string; description: string }[] = [
    {
        value: 'default',
        label: 'Open-Meteo default',
        description: 'Best-match blend of models. Finer grid and sharper rainfall peaks.',
    },
    {
        value: 'ecmwf_ifs025',
        label: 'ECMWF IFS 0.25°',
        description: 'European global model. Coarser 0.25° grid with smoother, lower peaks.',
    },
]

const RainfallForm = ({ initial }: { initial: RainfallSettings }) => {
    const { form, setField, dirty, saving, save } = useSettingsForm('rainfall', initial)

    return (
        <div className='flex flex-col gap-3'>
            <div role='radiogroup' aria-label='Weather model' className='flex flex-col gap-2'>
                {MODELS.map(({ value, label, description }) => (
                    <button
                        key={value}
                        type='button'
                        role='radio'
                        aria-checked={form.weather_model === value}
                        onClick={() => setField('weather_model', value)}
                        className={cn(
                            'rounded-md border px-4 py-3 text-left transition-colors',
                            form.weather_model === value
                                ? 'border-primary bg-primary/5'
                                : 'hover:bg-muted/50',
                        )}
                    >
                        <div className='text-sm font-medium'>{label}</div>
                        <div className='text-xs text-muted-foreground'>{description}</div>
                    </button>
                ))}
            </div>
            <p className='text-xs text-muted-foreground'>
                Saving a change immediately re-runs rainfall ingestion and risk scoring. Earlier
                hours keep the model they were recorded with, so the 6h–7d totals blend both models
                until the older readings age out.
            </p>
            <SaveBar dirty={dirty} saving={saving} onSave={save} />
        </div>
    )
}

const RainfallPanel = () => (
    <SettingsSection
        group='rainfall'
        title='Rainfall source'
        description='Which Open-Meteo weather model supplies rainfall for the risk engine.'
    >
        {(initial) => <RainfallForm initial={initial} />}
    </SettingsSection>
)

export default RainfallPanel
