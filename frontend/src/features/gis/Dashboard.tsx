import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, PanelRightOpen } from 'lucide-react'
import { Card } from '@/common/ui/card'
import ErrorState from '@/common/components/ErrorState'
import GISMap from './component/GISMap'
import RiskCard from './component/RiskCard'
import Legend from './component/Legend'
import PasonancaDamStatus from './component/PasonancaDamStatus'
import BarangayPanel from './component/BarangayPanel'
import DamPanel from './component/DamPanel'
import PoiEditPanel from './poi/PoiEditPanel'
import { usePoiEditor } from './poi/usePoiEditor'
import { useRiskMap } from './hooks/useRiskMap'
import { useDamStatus } from './hooks/useDamStatus'
import { useDamGeo } from './hooks/useDamGeo'

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
    const dam = useDamStatus()
    const damGeo = useDamGeo()
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [selectedDamId, setSelectedDamId] = useState<number | null>(null)
    const [panelHidden, setPanelHidden] = useState(false)
    const editor = usePoiEditor()
    const viewportWidth = useViewportWidth()
    // While editing POIs the right rail belongs to the POI editor, so the
    // barangay/dam panels and the summary cards step aside (without losing the
    // underlying selection, which returns once editing ends).
    const editing = editor.active != null
    const cardsVisible = !editor.editMode && selectedId == null && selectedDamId == null
    // The barangay panel can be hidden while its barangay stays focused on the map.
    const barangayPanelVisible = selectedId != null && !panelHidden && !editor.editMode
    const damPanelVisible = selectedDamId != null && !editor.editMode
    const panelWidth =
        barangayPanelVisible || damPanelVisible || editing ? Math.round(viewportWidth * 0.25) : 0

    // Barangay and dam panels are mutually exclusive — selecting one closes the other.
    const handleSelect = useCallback((id: number | null) => {
        setSelectedId(id)
        setSelectedDamId(null)
        setPanelHidden(false) // a fresh selection always shows the panel
    }, [])
    const handleSelectDam = useCallback((id: number) => {
        setSelectedDamId(id)
        setSelectedId(null)
    }, [])

    return (
        <>
            <Legend />

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
                            <PasonancaDamStatus data={dam.data} isLoading={dam.isLoading} />
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
                damGeo={damGeo.data}
                selectedDamId={selectedDamId}
                onSelectDam={handleSelectDam}
                editor={editor}
            />

            <PoiEditPanel editor={editor} />

            {barangayPanelVisible && selectedId != null && (
                <BarangayPanel
                    barangayId={selectedId}
                    onClose={() => setSelectedId(null)}
                    onHide={() => setPanelHidden(true)}
                />
            )}

            {/* Restore chip: shown when a barangay is focused but its panel is hidden. */}
            {selectedId != null && panelHidden && !editor.editMode && (
                <button
                    type='button'
                    onClick={() => setPanelHidden(false)}
                    className='bg-background hover:bg-muted absolute top-20 right-4 z-3 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium shadow-md transition-colors'
                >
                    <PanelRightOpen className='size-4' />
                    Show details
                </button>
            )}

            {damPanelVisible && (
                <DamPanel data={dam.data} isLoading={dam.isLoading} onClose={() => setSelectedDamId(null)} />
            )}
        </>
    )
}

export default Dashboard
