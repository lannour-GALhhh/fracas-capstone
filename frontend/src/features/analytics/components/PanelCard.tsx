import type { ReactNode } from 'react'

import ErrorState from '@/common/components/ErrorState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/common/ui/card'
import { cn } from '@/common/utils/utils'

interface PanelCardProps {
    title: string
    description?: string
    /** Optional slot rendered on the right of the header (e.g. a stat chip). */
    action?: ReactNode
    isLoading?: boolean
    isError?: boolean
    onRetry?: () => void
    /** Show the empty state instead of children (data loaded but nothing to plot). */
    isEmpty?: boolean
    emptyMessage?: string
    className?: string
    children: ReactNode
}

/** Consistent card shell: header, loading skeleton, error, empty state. */
const PanelCard = ({
    title,
    description,
    action,
    isLoading,
    isError,
    onRetry,
    isEmpty,
    emptyMessage = 'No data for this window yet.',
    className,
    children,
}: PanelCardProps) => (
    <Card className={cn('gap-3', className)}>
        <CardHeader className='flex flex-row items-start justify-between gap-2 space-y-0'>
            <div className='space-y-1'>
                <CardTitle className='text-sm font-semibold'>{title}</CardTitle>
                {description && <CardDescription className='text-xs'>{description}</CardDescription>}
            </div>
            {action}
        </CardHeader>
        <CardContent>
            {isError ? (
                <ErrorState
                    variant='inline'
                    message="Couldn't load this panel."
                    onRetry={onRetry}
                />
            ) : isLoading ? (
                <div className='h-48 animate-pulse rounded-lg bg-muted/60' aria-hidden />
            ) : isEmpty ? (
                <div className='flex h-48 items-center justify-center text-center'>
                    <p className='max-w-xs text-xs text-muted-foreground'>{emptyMessage}</p>
                </div>
            ) : (
                children
            )}
        </CardContent>
    </Card>
)

export default PanelCard
