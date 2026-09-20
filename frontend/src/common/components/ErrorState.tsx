import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/common/ui/button'
import { cn } from '@/common/utils/utils'
import { FadeIn } from '@/common/motion'

interface ErrorStateProps {
    /** Short, human headline. */
    title?: string
    /** Reassuring, plain-language explanation of what failed. */
    message: string
    /** Omit to fall back to a full page reload. */
    onRetry?: () => void
    /** Overrides the action button label. */
    retryLabel?: string
    /** `page` = centered, fills its area; `inline` = compact row for cards/panels/modals. */
    variant?: 'page' | 'inline'
    className?: string
}

/** Friendly failure state with a recovery action. */
const ErrorState = ({
    title = 'Something went wrong',
    message,
    onRetry,
    retryLabel,
    variant = 'page',
    className,
}: ErrorStateProps) => {
    const handleRetry = onRetry ?? (() => window.location.reload())
    const label = retryLabel ?? (onRetry ? 'Try again' : 'Reload page')
    const isPage = variant === 'page'

    return (
        <FadeIn
            role='alert'
            className={cn(
                'flex flex-col items-center text-center',
                isPage
                    ? 'min-h-[50vh] justify-center gap-3 p-6'
                    : 'gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-4',
                className,
            )}
        >
            <TriangleAlert
                className={cn('text-destructive', isPage ? 'size-8' : 'size-5')}
                strokeWidth={1.75}
            />
            <div className='flex flex-col gap-1'>
                <p className={cn('font-semibold', isPage ? 'text-base' : 'text-sm')}>{title}</p>
                <p
                    className={cn(
                        'text-muted-foreground',
                        isPage ? 'max-w-sm text-sm' : 'text-xs',
                    )}
                >
                    {message}
                </p>
            </div>
            <Button
                type='button'
                variant='outline'
                size={isPage ? 'default' : 'sm'}
                onClick={handleRetry}
                className='mt-1 cursor-pointer'
            >
                <RefreshCw />
                {label}
            </Button>
        </FadeIn>
    )
}

export default ErrorState
