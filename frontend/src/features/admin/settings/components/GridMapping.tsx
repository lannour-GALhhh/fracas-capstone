import { Button } from '@/common/ui/button'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useRainfallGrid, useRemapRainfallGrid } from '../../hooks/useSettings'

/** Dedup status + a one-click re-map, so one Open-Meteo request serves every barangay in a cell. */
const GridMapping = () => {
    const { data } = useRainfallGrid()
    const remap = useRemapRainfallGrid()

    return (
        <div className='mt-6 flex flex-col gap-3 border-t pt-4'>
            <div>
                <div className='text-sm font-medium'>Grid cells</div>
                <p className='text-xs text-muted-foreground'>
                    Barangays in the same weather cell share one request. New barangays are mapped
                    automatically, so re-mapping is only needed to force a refresh.
                </p>
            </div>
            {data && (
                <div className='text-xs text-muted-foreground'>
                    <p>
                        {data.mapped}/{data.barangays} barangays mapped into {data.cells} cells (about{' '}
                        {data.expected_daily_calls.toLocaleString()} calls/day).
                    </p>
                    <p>
                        Today: {data.calls_today.toLocaleString()} of{' '}
                        {data.daily_limit.toLocaleString()} calls used.
                    </p>
                    {!data.has_retry_headroom && (
                        <p className='text-destructive'>
                            Too close to the daily cap to leave room for retries.
                        </p>
                    )}
                </div>
            )}
            <div>
                <ConfirmDialog
                    trigger={
                        <Button size='sm' variant='outline' disabled={remap.isPending}>
                            {remap.isPending ? 'Re-mapping…' : 'Re-map grid cells'}
                        </Button>
                    }
                    title='Re-map grid cells now?'
                    description='Looks up every barangay again on Open-Meteo, one call each (about 100). It can take a few seconds.'
                    confirmLabel='Re-map'
                    isPending={remap.isPending}
                    onConfirm={() => remap.mutate()}
                />
            </div>
        </div>
    )
}

export default GridMapping
