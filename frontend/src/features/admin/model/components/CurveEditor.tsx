import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/common/ui/input'
import { Button } from '@/common/ui/button'
import type { Curve } from '../../types/model'

/**
 * A compact editor for a piecewise curve — a list of `[input, hazard]`
 * breakpoints. Used for the admin-tunable rainfall/accumulation scaling: the
 * `x` is mm (or mm/hr), the `y` is the 0–1 hazard it maps to. Points are kept
 * in ascending-x order by the backend; this just captures the values.
 */
const CurveEditor = ({
    label,
    description,
    xLabel,
    points,
    onChange,
}: {
    label: string
    description: string
    xLabel: string
    points: Curve
    onChange: (next: Curve) => void
}) => {
    const setPoint = (index: number, pos: 0 | 1, value: string) => {
        const next = points.map((p) => [...p] as [number, number])
        next[index][pos] = Number(value)
        onChange(next)
    }
    const remove = (index: number) => onChange(points.filter((_, i) => i !== index))
    const add = () => {
        const lastX = points.length ? points[points.length - 1][0] : 0
        onChange([...points, [lastX + 1, 1]])
    }

    return (
        <div>
            <p className='text-sm font-medium'>{label}</p>
            <p className='text-muted-foreground mb-2 text-xs'>{description}</p>
            <div className='flex flex-col gap-1.5'>
                <div className='text-muted-foreground grid grid-cols-[1fr_1fr_auto] gap-2 text-xs'>
                    <span>{xLabel}</span>
                    <span>Hazard (0–1)</span>
                    <span className='w-8' />
                </div>
                {points.map((point, i) => (
                    <div key={i} className='grid grid-cols-[1fr_1fr_auto] items-center gap-2'>
                        <Input
                            type='number'
                            step='0.5'
                            min={0}
                            value={String(point[0])}
                            onChange={(e) => setPoint(i, 0, e.target.value)}
                        />
                        <Input
                            type='number'
                            step='0.05'
                            min={0}
                            max={1}
                            value={String(point[1])}
                            onChange={(e) => setPoint(i, 1, e.target.value)}
                        />
                        <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='size-8'
                            aria-label={`Remove point ${i + 1}`}
                            onClick={() => remove(i)}
                            disabled={points.length <= 2}
                        >
                            <Trash2 className='size-4' />
                        </Button>
                    </div>
                ))}
                <Button type='button' variant='outline' size='sm' className='mt-1 self-start' onClick={add}>
                    <Plus className='size-4' />
                    Add point
                </Button>
            </div>
        </div>
    )
}

export default CurveEditor
