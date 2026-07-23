import { useState, type ReactElement } from 'react'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/common/ui/dialog'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/common/ui/field'
import { Input } from '@/common/ui/input'
import { Button } from '@/common/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/common/ui/select'
import { useZodForm } from '@/common/hooks/useZodForm'
import { RiskConfigSchema } from '../../schemas'
import { useCreateRiskConfig, useUpdateRiskConfig } from '../../hooks/useModelMutations'
import type { CombinationMode, Curve, RiskConfig, ZoneAggregation } from '../../types/model'
import CurveEditor from './CurveEditor'

type FormState = {
    name: string
    combination_mode: CombinationMode
    zone_aggregation: ZoneAggregation
    rainfall: string
    susceptibility: string
    medium: string
    high: string
    critical: string
}

const DEFAULT_RAINFALL_CURVE: Curve = [
    [0, 0],
    [2.5, 0.05],
    [7.5, 0.25],
    [15, 0.55],
    [30, 0.85],
    [65, 1],
]

const DEFAULT_ACCUMULATION_CURVE: Curve = [
    [0, 0],
    [50, 0.33],
    [100, 0.66],
    [200, 1],
]

const toForm = (config?: RiskConfig): FormState =>
    config
        ? {
              name: config.name,
              combination_mode: config.combination_mode,
              zone_aggregation: config.zone_aggregation,
              rainfall: String(config.weights.rainfall),
              susceptibility: String(config.weights.susceptibility),
              medium: String(config.thresholds.medium),
              high: String(config.thresholds.high),
              critical: String(config.thresholds.critical),
          }
        : {
              name: '',
              combination_mode: 'rainfall_gated',
              zone_aggregation: 'mean',
              rainfall: '0.5',
              susceptibility: '0.5',
              medium: '25',
              high: '50',
              critical: '75',
          }

/** Create or edit a scoring config. Editing never touches `is_active` —
 * that's the separate activate action, since it has side effects (deactivates
 * the current config) that deserve their own confirmation. */
const RiskConfigFormDialog = ({
    trigger,
    config,
}: {
    trigger: ReactElement
    config?: RiskConfig
}) => {
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState<FormState>(() => toForm(config))
    // Curves are arrays, managed outside the flat zod form; backend validates
    // strict ordering/bounds and surfaces any error on save.
    const [rainfallCurve, setRainfallCurve] = useState<Curve>(
        () => config?.rainfall_curve ?? DEFAULT_RAINFALL_CURVE,
    )
    const [accumulationCurve, setAccumulationCurve] = useState<Curve>(
        () => config?.accumulation_curve ?? DEFAULT_ACCUMULATION_CURVE,
    )
    const create = useCreateRiskConfig()
    const update = useUpdateRiskConfig(config?.id ?? 0)
    const mutation = config ? update : create

    const { fieldError, onBlur, handleSubmit, reset } = useZodForm(RiskConfigSchema, form)

    const onOpenChange = (next: boolean) => {
        if (next) {
            setForm(toForm(config))
            setRainfallCurve(config?.rainfall_curve ?? DEFAULT_RAINFALL_CURVE)
            setAccumulationCurve(config?.accumulation_curve ?? DEFAULT_ACCUMULATION_CURVE)
            reset()
            mutation.reset()
        }
        setOpen(next)
    }

    const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value }))

    const gated = form.combination_mode === 'rainfall_gated'

    const onSubmit = handleSubmit((data) => {
        const payload = {
            name: data.name,
            combination_mode: data.combination_mode,
            zone_aggregation: data.zone_aggregation,
            weights: { rainfall: data.rainfall, susceptibility: data.susceptibility },
            thresholds: { medium: data.medium, high: data.high, critical: data.critical },
            rainfall_curve: rainfallCurve,
            accumulation_curve: accumulationCurve,
        }
        mutation.mutate(payload, { onSuccess: () => setOpen(false) })
    })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger render={trigger} />
            <DialogContent className='sm:max-w-md'>
                <form onSubmit={onSubmit} className='flex flex-col gap-4'>
                    <DialogHeader>
                        <DialogTitle>{config ? 'Edit config' : 'New config'}</DialogTitle>
                        <DialogDescription>
                            Rainfall-gated scoring means no rain → no risk. Tune the rainfall curve
                            below; thresholds must satisfy medium &lt; high &lt; critical (0–100).
                        </DialogDescription>
                    </DialogHeader>

                    <div className='flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1'>
                        <Field>
                            <FieldLabel htmlFor='config-name'>Name</FieldLabel>
                            <Input id='config-name' value={form.name} onChange={set('name')} onBlur={onBlur('name')} />
                            <FieldError errors={fieldError('name')} />
                        </Field>

                        <div className='grid grid-cols-2 gap-4'>
                            <Field>
                                <FieldLabel htmlFor='config-mode'>Combination</FieldLabel>
                                <Select
                                    id='config-mode'
                                    value={form.combination_mode}
                                    onValueChange={(v) =>
                                        setForm((p) => ({ ...p, combination_mode: v as CombinationMode }))
                                    }
                                >
                                    <SelectTrigger className='w-full'>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value='rainfall_gated'>Rainfall-gated</SelectItem>
                                        <SelectItem value='weighted_sum'>Weighted sum (legacy)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor='config-agg'>Zone aggregation</FieldLabel>
                                <Select
                                    id='config-agg'
                                    value={form.zone_aggregation}
                                    onValueChange={(v) =>
                                        setForm((p) => ({ ...p, zone_aggregation: v as ZoneAggregation }))
                                    }
                                >
                                    <SelectTrigger className='w-full'>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value='mean'>Mean (average)</SelectItem>
                                        <SelectItem value='max'>Max (worst zone)</SelectItem>
                                        <SelectItem value='area_weighted'>Area-weighted</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>

                        <CurveEditor
                            label='Rainfall scaling (PAGASA)'
                            description='mm/hr → 0–1 hazard. Steeper low end means light rain barely registers.'
                            xLabel='Rainfall (mm/hr)'
                            points={rainfallCurve}
                            onChange={setRainfallCurve}
                        />

                        <CurveEditor
                            label='Accumulation (saturation)'
                            description='24h total (mm) → 0–1 saturation hazard.'
                            xLabel='Accumulated (mm)'
                            points={accumulationCurve}
                            onChange={setAccumulationCurve}
                        />

                        {!gated && (
                            <div>
                                <p className='mb-2 text-sm font-medium'>Weights (weighted-sum mode)</p>
                                <div className='grid grid-cols-2 gap-4'>
                                    <Field>
                                        <FieldLabel htmlFor='config-rainfall'>Rainfall</FieldLabel>
                                        <Input
                                            id='config-rainfall'
                                            type='number'
                                            step='0.01'
                                            min={0}
                                            max={1}
                                            value={form.rainfall}
                                            onChange={set('rainfall')}
                                            onBlur={onBlur('rainfall')}
                                        />
                                        <FieldError errors={fieldError('rainfall')} />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor='config-susceptibility'>Susceptibility</FieldLabel>
                                        <Input
                                            id='config-susceptibility'
                                            type='number'
                                            step='0.01'
                                            min={0}
                                            max={1}
                                            value={form.susceptibility}
                                            onChange={set('susceptibility')}
                                            onBlur={onBlur('susceptibility')}
                                        />
                                        <FieldError errors={fieldError('susceptibility')} />
                                    </Field>
                                </div>
                            </div>
                        )}

                        <div>
                            <p className='mb-2 text-sm font-medium'>Thresholds</p>
                            <div className='grid grid-cols-3 gap-4'>
                                <Field>
                                    <FieldLabel htmlFor='config-medium'>Medium</FieldLabel>
                                    <Input
                                        id='config-medium'
                                        type='number'
                                        step='0.5'
                                        value={form.medium}
                                        onChange={set('medium')}
                                        onBlur={onBlur('medium')}
                                    />
                                    <FieldError errors={fieldError('medium')} />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor='config-high'>High</FieldLabel>
                                    <Input
                                        id='config-high'
                                        type='number'
                                        step='0.5'
                                        value={form.high}
                                        onChange={set('high')}
                                        onBlur={onBlur('high')}
                                    />
                                    <FieldError errors={fieldError('high')} />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor='config-critical'>Critical</FieldLabel>
                                    <Input
                                        id='config-critical'
                                        type='number'
                                        step='0.5'
                                        value={form.critical}
                                        onChange={set('critical')}
                                        onBlur={onBlur('critical')}
                                    />
                                    <FieldError errors={fieldError('critical')} />
                                </Field>
                            </div>
                        </div>
                    </div>

                    {mutation.isError && (
                        <FieldDescription className='text-destructive'>
                            Couldn't save the config. Check the fields and try again.
                        </FieldDescription>
                    )}

                    <DialogFooter>
                        <DialogClose render={<Button type='button' variant='outline' />}>
                            Cancel
                        </DialogClose>
                        <Button type='submit' disabled={mutation.isPending}>
                            {mutation.isPending ? 'Saving…' : config ? 'Save changes' : 'Create config'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default RiskConfigFormDialog
