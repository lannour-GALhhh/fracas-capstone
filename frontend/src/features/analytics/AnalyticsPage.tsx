import { useState } from 'react'

import { PageTransition } from '@/common/motion'
import { DEFAULT_WINDOW } from './constants/analytics'
import type { AnalyticsWindow } from './types/api'
import HotspotLeaderboard from './components/HotspotLeaderboard'
import KpiRow from './components/KpiRow'
import ModelPerformanceChart from './components/ModelPerformanceChart'
import RainfallFloodTimeline from './components/RainfallFloodTimeline'
import WindowSelector from './components/WindowSelector'

/**
 * Operator analytics: situational KPI strip + hotspot leaderboard beside the
 * rainfall / dam / model panels. One window selector drives every query.
 */
const AnalyticsPage = () => {
    const [days, setDays] = useState<AnalyticsWindow>(DEFAULT_WINDOW)

    return (
        <PageTransition className='w-full space-y-4 p-4'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <div>
                    <h1 className='text-2xl font-semibold'>Analytics</h1>
                    <p className='text-xs text-muted-foreground'>
                        Flood, rainfall, and model trends across Zamboanga City
                    </p>
                </div>
                <WindowSelector value={days} onChange={setDays} />
            </div>

            <KpiRow days={days} />

            <div className='grid gap-4 xl:grid-cols-2'>
                <HotspotLeaderboard days={days} />
                <div className='space-y-4'>
                    <RainfallFloodTimeline days={days} />
                    <ModelPerformanceChart />
                </div>
            </div>
        </PageTransition>
    )
}

export default AnalyticsPage
