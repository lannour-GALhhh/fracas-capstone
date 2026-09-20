import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/common/ui/card'
import { Button } from '@/common/ui/button'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useRunPipeline, useRunRetention } from '../../hooks/useSystem'

/** Off-cycle manual triggers. Both queue async Celery tasks; results appear on
 * the next status refresh. */
const OpsActions = () => {
    const runPipeline = useRunPipeline()
    const runRetention = useRunRetention()

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manual actions</CardTitle>
                <CardDescription>Run pipeline stages off their schedule.</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-wrap gap-3'>
                <ConfirmDialog
                    trigger={
                        <Button size='sm' variant='outline' disabled={runPipeline.isPending}>
                            Run pipeline now
                        </Button>
                    }
                    title='Run the scoring pipeline now?'
                    description='Ingests rainfall, recomputes scores, and syncs evacuations immediately, off the 15-minute schedule.'
                    confirmLabel='Run pipeline'
                    isPending={runPipeline.isPending}
                    onConfirm={() => runPipeline.mutate()}
                />
                <ConfirmDialog
                    trigger={
                        <Button size='sm' variant='outline' disabled={runRetention.isPending}>
                            Run cleanup now
                        </Button>
                    }
                    title='Run retention cleanup now?'
                    description='Prunes rainfall and risk-score rows older than the configured retention windows.'
                    confirmLabel='Run cleanup'
                    destructive
                    isPending={runRetention.isPending}
                    onConfirm={() => runRetention.mutate()}
                />
            </CardContent>
        </Card>
    )
}

export default OpsActions
