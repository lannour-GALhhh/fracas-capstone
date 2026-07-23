import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/common/ui/table'
import { Badge } from '@/common/ui/badge'
import { Button } from '@/common/ui/button'
import { useRiskConfigs } from '../../hooks/useRiskConfigs'
import RiskConfigFormDialog from './RiskConfigFormDialog'
import ActivateConfigButton from './ActivateConfigButton'

const COLS = 5

const RiskConfigsTable = () => {
    const { data, isLoading, isError } = useRiskConfigs()
    const configs = data?.results ?? []

    return (
        <Table className='rounded border border-border'>
            <TableHeader className='bg-accent'>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Thresholds</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading && (
                    <TableRow>
                        <TableCell colSpan={COLS} className='text-black/50'>
                            Loading…
                        </TableCell>
                    </TableRow>
                )}
                {isError && (
                    <TableRow>
                        <TableCell colSpan={COLS} className='text-destructive'>
                            Couldn't load configs.
                        </TableCell>
                    </TableRow>
                )}
                {!isLoading && !isError && configs.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={COLS} className='text-black/50'>
                            No configs yet.
                        </TableCell>
                    </TableRow>
                )}
                {configs.map((config) => (
                    <TableRow key={config.id}>
                        <TableCell className='font-medium'>
                            <div className='flex items-center gap-2'>
                                {config.name}
                                {config.is_active && <Badge>Active</Badge>}
                            </div>
                        </TableCell>
                        <TableCell className='text-black/60'>
                            {config.combination_mode === 'rainfall_gated'
                                ? `Rainfall-gated · ${config.zone_aggregation}`
                                : 'Weighted sum'}
                        </TableCell>
                        <TableCell className='text-black/60'>
                            {config.thresholds.medium} / {config.thresholds.high} /{' '}
                            {config.thresholds.critical}
                        </TableCell>
                        <TableCell className='text-black/60'>
                            {new Date(config.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                            <div className='flex items-center justify-end gap-2'>
                                <RiskConfigFormDialog
                                    config={config}
                                    trigger={
                                        <Button size='sm' variant='ghost'>
                                            Edit
                                        </Button>
                                    }
                                />
                                <ActivateConfigButton config={config} />
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

export default RiskConfigsTable
