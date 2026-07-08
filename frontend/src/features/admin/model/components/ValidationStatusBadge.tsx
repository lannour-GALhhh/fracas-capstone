import { Badge } from '@/common/ui/badge'
import capitalize from '@/common/utils/capitalize'
import { cn } from '@/common/utils/utils'
import type { ValidationStatus } from '../../types/model'

const STYLES: Record<ValidationStatus, string> = {
    pending: 'bg-slate-100 text-slate-600',
    running: 'bg-blue-100 text-blue-700',
    done: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
}

const ValidationStatusBadge = ({ status }: { status: ValidationStatus }) => (
    <Badge className={cn(STYLES[status])}>{capitalize(status)}</Badge>
)

export default ValidationStatusBadge
