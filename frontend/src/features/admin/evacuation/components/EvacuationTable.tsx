import type { Feature, Point } from 'geojson'
import { Pencil, Trash2 } from 'lucide-react'
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
import {
    useDeleteEvacuationCenter,
    useEvacuationCenters,
} from '@/features/gis/poi/usePoi'
import type { EvacuationProperties } from '@/features/gis/poi/types'
import ConfirmDialog from '../../components/ConfirmDialog'
import EvacuationFormDialog from './EvacuationFormDialog'

type EvacFeature = Feature<Point, EvacuationProperties>

const COLS = 6

const EvacuationTable = () => {
    const { data, isLoading, isError } = useEvacuationCenters()
    const del = useDeleteEvacuationCenter()
    const centers = (data?.features ?? []) as EvacFeature[]

    return (
        <Table className='mt-4 rounded border border-border'>
            <TableHeader className='bg-accent'>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Barangay</TableHead>
                    <TableHead className='text-right'>Capacity</TableHead>
                    <TableHead>Coordinates</TableHead>
                    <TableHead>Status</TableHead>
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
                            Couldn't load evacuation centers.
                        </TableCell>
                    </TableRow>
                )}
                {!isLoading && !isError && centers.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={COLS} className='text-black/50'>
                            No evacuation centers yet.
                        </TableCell>
                    </TableRow>
                )}
                {centers.map((center) => {
                    const [lng, lat] = center.geometry.coordinates
                    const p = center.properties
                    return (
                        <TableRow key={p.id}>
                            <TableCell className='font-medium'>{p.name}</TableCell>
                            <TableCell className='text-black/60'>
                                {p.barangay_name ?? '—'}
                            </TableCell>
                            <TableCell className='text-right text-black/60'>
                                {p.capacity != null ? p.capacity.toLocaleString() : '—'}
                            </TableCell>
                            <TableCell className='text-black/60 tabular-nums'>
                                {lat.toFixed(5)}, {lng.toFixed(5)}
                            </TableCell>
                            <TableCell>
                                {p.is_active ? (
                                    <Badge>Active</Badge>
                                ) : (
                                    <Badge variant='secondary'>Inactive</Badge>
                                )}
                            </TableCell>
                            <TableCell>
                                <div className='flex items-center justify-end gap-1'>
                                    <EvacuationFormDialog
                                        center={center}
                                        trigger={
                                            <Button size='sm' variant='ghost'>
                                                <Pencil className='size-3.5' />
                                                Edit
                                            </Button>
                                        }
                                    />
                                    <ConfirmDialog
                                        title='Delete evacuation center?'
                                        description={`“${p.name}” will be removed from the map and the resident app.`}
                                        confirmLabel='Delete'
                                        destructive
                                        isPending={del.isPending}
                                        onConfirm={() => del.mutate(p.id)}
                                        trigger={
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                className='text-destructive hover:text-destructive'
                                            >
                                                <Trash2 className='size-3.5' />
                                                Delete
                                            </Button>
                                        }
                                    />
                                </div>
                            </TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
    )
}

export default EvacuationTable
