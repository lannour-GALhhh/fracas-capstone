import { Hourglass, TriangleAlert } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import ErrorState from '@/common/components/ErrorState'
import { useBarangayHighRiskStreets } from '../hooks/useBarangayHighRiskStreets'
import { SUSCEPTIBILITY_COLORS, SUSCEPTIBILITY_LABELS } from '../constants/susceptibility'

interface HighRiskStreetsPanelProps {
    barangayId: number
}

/**
 * Floating companion to `BarangayPanel`, docked directly to its left —
 * `right` mirrors that panel's own `w-1/4 min-w-80` so the two line up
 * regardless of viewport width. Fixed at a third of its height per design:
 * this is a quick-glance list, not another data-dense breakdown.
 */
const HighRiskStreetsPanel = ({ barangayId }: HighRiskStreetsPanelProps) => {
    const { data: streets, isLoading, isError, refetch } = useBarangayHighRiskStreets(barangayId)
    const level = streets?.[0]?.susceptibility_level
    const reduce = useReducedMotion()

    return (
        <motion.div
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className='bg-background absolute top-16 right-[calc(max(25%,20rem)+0.75rem)] z-30 h-[calc((100vh-4rem)/3)] w-72 rounded-lg border shadow-xl'
        >
            <div className='flex h-full flex-col gap-2 p-4'>
                <div className='flex items-start justify-between gap-2'>
                    <div className='flex flex-col gap-0.5'>
                        <h2 className='flex items-center gap-1.5 text-sm font-semibold'>
                            <TriangleAlert className='text-destructive size-4 shrink-0' />
                            High-risk Streets
                        </h2>
                        <p className='text-muted-foreground text-xs'>Avoid if possible</p>
                    </div>
                    {level && (
                        <span
                            className='shrink-0 rounded px-1.5 py-0.5 text-xs font-medium'
                            style={{
                                backgroundColor: `${SUSCEPTIBILITY_COLORS[level]}26`,
                                color: SUSCEPTIBILITY_COLORS[level],
                            }}
                        >
                            {SUSCEPTIBILITY_LABELS[level]}
                        </span>
                    )}
                </div>

                <div className='min-h-0 flex-1 overflow-y-auto'>
                    {isLoading && (
                        <div className='text-muted-foreground flex items-center gap-2 pt-2 text-xs'>
                            <Hourglass className='size-3.5 animate-spin' strokeOpacity={0.6} />
                            Loading streets…
                        </div>
                    )}
                    {isError && (
                        <ErrorState
                            variant='inline'
                            title='Streets unavailable'
                            message='Could not load the street list for this barangay.'
                            onRetry={() => refetch()}
                        />
                    )}
                    {streets && streets.length === 0 && (
                        <p className='text-muted-foreground pt-2 text-xs'>
                            No named high-risk streets on record for this barangay.
                        </p>
                    )}
                    {streets && streets.length > 0 && (
                        <ul className='flex flex-col gap-0.5'>
                            {streets.map((street) => (
                                <li
                                    key={street.id}
                                    className='truncate rounded-md px-2 py-1 text-sm'
                                    title={street.name}
                                >
                                    {street.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

export default HighRiskStreetsPanel
