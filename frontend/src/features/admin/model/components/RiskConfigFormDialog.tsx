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
import { useZodForm } from '@/common/hooks/useZodForm'
import { RiskConfigSchema } from '../../schemas'
import { useCreateRiskConfig, useUpdateRiskConfig } from '../../hooks/useModelMutations'
import type { RiskConfig } from '../../types/model'

type FormState = {
    name: string
    rainfall: string
    susceptibility: string
    medium: string
    high: string
    critical: string
}

const toForm = (config?: RiskConfig): FormState =>
    config
        ? {
              name: config.name,
              rainfall: String(config.weights.rainfall),
              susceptibility: String(config.weights.susceptibility),
              medium: String(config.thresholds.medium),
              high: String(config.thresholds.high),
              critical: String(config.thresholds.critical),
          }
        : {
              name: '',
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
    const create = useCreateRiskConfig()
    const update = useUpdateRiskConfig(config?.id ?? 0)
    const mutation = config ? update : create

    const { fieldError, onBlur, handleSubmit, reset } = useZodForm(RiskConfigSchema, form)

    const onOpenChange = (next: boolean) => {
        if (next) {
            setForm(toForm(config))
            reset()
            mutation.reset()
        }
        setOpen(next)
    }

    const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value }))

    const onSubmit = handleSubmit((data) => {
        const payload = {
            name: data.name,
            weights: { rainfall: data.rainfall, susceptibility: data.susceptibility },
            thresholds: { medium: data.medium, high: data.high, critical: data.critical },
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
                            Weights must sum to 1.0; thresholds must satisfy medium &lt; high &lt;
                            critical, all on a 0–100 scale.
                        </DialogDescription>
                    </DialogHeader>

                    <div className='flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1'>
                        <Field>
                            <FieldLabel htmlFor='config-name'>Name</FieldLabel>
                            <Input id='config-name' value={form.name} onChange={set('name')} onBlur={onBlur('name')} />
                            <FieldError errors={fieldError('name')} />
                        </Field>

                        <div>
                            <p className='mb-2 text-sm font-medium'>Weights</p>
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
