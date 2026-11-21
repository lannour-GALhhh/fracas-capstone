import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/common/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/common/ui/select'
import { Skeleton } from '@/common/ui/skeleton'
import ErrorState from '@/common/components/ErrorState'
import { useActiveRiskConfig, useUpdateZoneAggregation } from '../../hooks/useSystem'
import type { RiskConfigSummary, ZoneAggregation } from '../../types/system'
import { SaveBar, SettingRow } from '../../settings/components/fields'

const OPTIONS: { value: ZoneAggregation; label: string; hint: string }[] = [
    { value: 'max', label: 'Worst zone', hint: 'A barangay is as hazardous as its most flood-prone zone (most cautious).' },
    { value: 'area_weighted', label: 'Weighted by area', hint: "Each zone counts in proportion to its land area; can dilute small high-risk zones." },
]
const LABELS: Record<ZoneAggregation, string> = {
    max: 'Worst zone',
    area_weighted: 'Weighted by area',
    mean: 'Simple average',
}

const ZoneAggregationForm = ({ config }: { config: RiskConfigSummary }) => {
    const [value, setValue] = useState(config.zone_aggregation)
    const update = useUpdateZoneAggregation()
    const hint = OPTIONS.find((o) => o.value === value)?.hint

    return (
        <div>
            <SettingRow
                label='Zone aggregation'
                description={hint ?? 'Average of all zones in the barangay.'}
                htmlFor='zone_aggregation'
                control={
                    <Select value={value} onValueChange={(v) => setValue(v as ZoneAggregation)}>
                        <SelectTrigger id='zone_aggregation' className='w-44'>
                            <SelectValue>{(v) => LABELS[v as ZoneAggregation]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                    {o.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                }
            />
            <SaveBar
                dirty={value !== config.zone_aggregation}
                saving={update.isPending}
                onSave={() => update.mutate({ id: config.id, value })}
            />
        </div>
    )
}

/** Switch how per-zone hazards roll up into a barangay's headline score. */
const ZoneAggregationCard = () => {
    const { data, isLoading, isError, refetch } = useActiveRiskConfig()

    return (
        <Card>
            <CardHeader>
                <CardTitle>Risk scoring</CardTitle>
                <CardDescription>How a barangay's zone scores combine into one hazard score.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && <Skeleton className='h-20 w-full' />}
                {isError && (
                    <ErrorState
                        variant='inline'
                        message="Couldn't load the scoring config."
                        onRetry={() => refetch()}
                    />
                )}
                {data && <ZoneAggregationForm key={data.zone_aggregation} config={data} />}
            </CardContent>
        </Card>
    )
}

export default ZoneAggregationCard
