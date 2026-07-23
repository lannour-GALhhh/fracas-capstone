import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, PanelRightOpen } from 'lucide-react'
import { Card } from '@/common/ui/card'
import ErrorState from '@/common/components/ErrorState'
import GISMap from './component/GISMap'
import RiskCard from './component/RiskCard'
import Legend from './component/Legend'
import LayersControl from './component/LayersControl'
import MapViewToggle from './component/MapViewToggle'
import BarangayPanel from './component/BarangayPanel'
import { useRiskMap } from './hooks/useRiskMap'
import { type LayerKey, type LayerVisibility } from './constants/layers'
import { type ZoneColorMode } from './constants/susceptibility'

/** Live viewport width, so panel padding stays correct across resizes. */
const useViewportWidth = (): number => {
    const [width, setWidth] = useState(() => window.innerWidth)
    useEffect(() => {
        const onResize = () => setWidth(window.innerWidth)
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])
    return width
}

const FreshnessBar = ({
    computedAt,
    degradedCount,
}: {
    computedAt: string | null
    degradedCount: number
}) => (
    <Card size='sm' className='col-span-2 flex-row items-center justify-between px-3 py-2'>
        <span className='text-muted-foreground text-xs'>
            {computedAt
                ? `Updated ${formatDistanceToNow(new Date(computedAt), { addSuffix: true })}`
                : 'Awaiting first computation'}
        </span>
        {degradedCount > 0 && (
            <span className='text-destructive flex items-center gap-1 text-xs font-medium'>
                <AlertTriangle className='size-3.5' />
                {degradedCount} degraded
            </span>
        )}
    </Card>
)

const Dashboard = () => {
    const { features, groups, computedAt, degradedCount, isLoading, isError, refetch } = useRiskMap()
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [panelHidden, setPanelHidden] = useState(false)
    const [layers, setLayers] = useState<LayerVisibility>({
        hazard: true,
        evacuation: true,
        low: true,
        moderate: true,
        high: true,
        very_high: true,
    })
    // Whether the hazard zones show their susceptibility class or computed risk.
    const [zoneColorMode, setZoneColorMode] = useState<ZoneColorMode>('susceptibility')
    const viewportWidth = useViewportWidth()
    const cardsVisible = selectedId == null
    // The barangay panel can be hidden while its barangay stays focused on the map.
    const barangayPanelVisible = selectedId != null && !panelHidden
    const panelWidth = barangayPanelVisible ? Math.round(viewportWidth * 0.25) : 0

    const handleSelect = useCallback((id: number | null) => {
        setSelectedId(id)
        setPanelHidden(false) // a fresh selection always shows the panel
    }, [])

    const toggleLayer = (key: LayerKey) => setLayers((l) => ({ ...l, [key]: !l[key] }))

    return (
        <>
            <div className='absolute top-20 left-4 z-2 flex items-start gap-2'>
                <Legend view={zoneColorMode} />
                <div className='flex h-fit flex-col items-start gap-1.5'>
                    <div className='flex h-fit items-center gap-1 rounded-full border bg-background/95 px-2 py-1.5 shadow-md backdrop-blur'>
                        <LayersControl layers={layers} onToggle={toggleLayer} />
                    </div>
                    <div className='flex h-fit items-center rounded-full border bg-background/95 p-1 shadow-md backdrop-blur'>
                        <MapViewToggle value={zoneColorMode} onChange={setZoneColorMode} />
                    </div>
                </div>
            </div>

            {cardsVisible && (
                <div className='absolute top-20 right-4 z-2 grid w-1/4 grid-cols-2 gap-2'>
                    {isError ? (
                        <ErrorState
                            variant='inline'
                            className='col-span-2'
                            title='Risk data unavailable'
                            message='We couldn’t load the latest barangay risk scores. The map may be out of date until this recovers.'
                            onRetry={() => refetch()}
                        />
                    ) : (
                        <>
                            <FreshnessBar computedAt={computedAt} degradedCount={degradedCount} />
                            {groups.map((group) => (
                                <RiskCard key={group.category} group={group} onSelect={handleSelect} />
                            ))}
                        </>
                    )}
                </div>
            )}

            {isLoading && (
                <Card
                    size='sm'
                    className='absolute bottom-4 left-1/2 z-2 -translate-x-1/2 px-3 py-2'
                >
                    <span className='text-muted-foreground text-xs'>Loading risk data…</span>
                </Card>
            )}

            <GISMap
                data={features}
                selectedId={selectedId}
                onSelect={handleSelect}
                panelWidth={panelWidth}
                layers={layers}
                zoneColorMode={zoneColorMode}
            />

            {barangayPanelVisible && selectedId != null && (
                <BarangayPanel
                    barangayId={selectedId}
                    onClose={() => setSelectedId(null)}
                    onHide={() => setPanelHidden(true)}
                />
            )}

            {/* Restore chip: shown when a barangay is focused but its panel is hidden. */}
            {selectedId != null && panelHidden && (
                <button
                    type='button'
                    onClick={() => setPanelHidden(false)}
                    className='bg-background hover:bg-muted absolute top-20 right-4 z-3 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium shadow-md transition-colors'
                >
                    <PanelRightOpen className='size-4' />
                    Show details
                </button>
            )}
        </>
    )
}

export default Dashboard
