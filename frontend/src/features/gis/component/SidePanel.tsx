import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/common/utils/utils'

/**
 * The full-height right rail shared by the barangay detail panel.
 * Sits below the floating header (top-16) and runs to the bottom of the screen,
 * so a panel reads as a docked sidebar rather than a floating card.
 */
const SidePanel = ({
    children,
    footer,
    className,
}: {
    children: React.ReactNode
    /** Rendered below the scrollable content, pinned outside the scroll area
     * so it stays visible regardless of scroll position (e.g. action buttons). */
    footer?: React.ReactNode
    className?: string
}) => {
    const reduce = useReducedMotion()
    return (
        <motion.div
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
                'absolute top-16 right-0 bottom-0 z-30 flex w-1/4 min-w-80 flex-col border-l bg-background shadow-xl',
                className,
            )}
        >
            <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4'>{children}</div>
            {footer && <div className='shrink-0 border-t p-4'>{footer}</div>}
        </motion.div>
    )
}

export default SidePanel
