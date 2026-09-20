import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/common/ui/card'
import { Skeleton } from '@/common/ui/skeleton'
import ErrorState from '@/common/components/ErrorState'
import { useSettings } from '../../hooks/useSettings'
import type { SettingsByGroup, SettingsGroup } from '../../types/settings'

/** Loads one settings group and hands its values to a panel. */
export function SettingsSection<G extends SettingsGroup>({
    group,
    title,
    description,
    children,
}: {
    group: G
    title: string
    description?: string
    children: (initial: SettingsByGroup[G]) => ReactNode
}) {
    const { data, isLoading, isError, refetch } = useSettings(group)

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent>
                {isLoading && (
                    <div className='flex flex-col gap-4'>
                        <Skeleton className='h-8 w-full' />
                        <Skeleton className='h-8 w-3/4' />
                    </div>
                )}
                {isError && (
                    <ErrorState
                        variant='inline'
                        message="Couldn't load these settings."
                        onRetry={() => refetch()}
                    />
                )}
                {data && children(data)}
            </CardContent>
        </Card>
    )
}
