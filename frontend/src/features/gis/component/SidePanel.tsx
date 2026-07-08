import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/common/utils/utils'

/**
 * The full-height right rail shared by the barangay detail panel.
 * Sits below the floating header (top-16) and runs to the bottom of the screen,
 * so a panel reads as a docked sidebar rather than a floating card.
 */
const SidePanel = ({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) => {
    const reduce = useReducedMotion()
    return (
        <motion.div
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
                'absolute top-16 right-0 bottom-0 z-30 w-1/4 min-w-80 border-l bg-background shadow-xl',
                className,
            )}
        >
            <div className='flex h-full flex-col gap-3 overflow-y-auto p-4'>{children}</div>
        </motion.div>
    )
}

export default SidePanel
