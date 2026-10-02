import { useState } from 'react'
import type { Feature, Point } from 'geojson'
import { useNavigate } from 'react-router-dom'
import {
    CircleCheck,
    CircleOff,
    Crosshair,
    ImageIcon,
    Landmark,
    MapPinned,
    Pencil,
    Phone,
    Tent,
    Archive,
    Users,
} from 'lucide-react'
import { Badge } from '@/common/ui/badge'
import { Button } from '@/common/ui/button'
import ImageLightbox from '@/common/components/ImageLightbox'
import ConfirmDialog from '@/features/admin/components/ConfirmDialog'
import { useArchiveEvacuationCenter } from '@/features/gis/poi/usePoi'
import type { EvacuationProperties } from '@/features/gis/poi/types'
import CenterFormDialog from './CenterFormDialog'

type EvacFeature = Feature<Point, EvacuationProperties>

/** One icon-led row of center info; the icon stands in for a text label. */
const InfoRow = ({
    icon,
    title,
    children,
}: {
    icon: React.ReactNode
    title: string
    children: React.ReactNode
}) => (
    <div className='flex items-start gap-2.5 text-sm' title={title}>
        <span className='text-muted-foreground mt-0.5 shrink-0' aria-label={title}>
            {icon}
        </span>
        <div className='min-w-0'>{children}</div>
    </div>
)

/** Wide card: main photo on the left half, details + actions on the right half. */
const CenterCard = ({ center, highlighted = false }: { center: EvacFeature; highlighted?: boolean }) => {
    const navigate = useNavigate()
    const del = useArchiveEvacuationCenter()
    const [viewing, setViewing] = useState<number | null>(null)
    const [lng, lat] = center.geometry.coordinates
    const p = center.properties
    const urls = p.images.map((i) => i.image)

    return (
        <div
            id={`center-${p.id}`}
            className={`bg-card flex min-h-60 overflow-hidden rounded-lg border shadow-sm ${
                highlighted ? 'ring-primary ring-2' : ''
            }`}
        >
            <div className='bg-muted relative w-1/2 shrink-0'>
                {urls[0] ? (
                    <button
                        type='button'
                        aria-label={`View photos of ${p.name}`}
                        onClick={() => setViewing(0)}
                        className='size-full cursor-zoom-in'
                    >
                        <img src={urls[0]} alt={p.name} className='size-full object-cover' />
                    </button>
                ) : (
                    <div className='text-muted-foreground flex size-full items-center justify-center'>
                        <Tent className='size-12 opacity-40' />
                    </div>
                )}
                {urls.length > 1 && (
                    <span className='absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white'>
                        <ImageIcon className='size-3' />
                        {urls.length}
                    </span>
                )}
            </div>

            <div className='flex w-1/2 flex-col justify-between gap-4 p-4'>
                <div className='flex flex-col gap-2'>
                    <InfoRow icon={<Landmark className='size-4' />} title='Name'>
                        <span className='text-base leading-tight font-semibold'>{p.name}</span>
                    </InfoRow>
                    <InfoRow icon={<MapPinned className='size-4' />} title='Barangay'>
                        {p.barangay_name ?? '—'}
                    </InfoRow>
                    <InfoRow icon={<Users className='size-4' />} title='Capacity'>
                        {p.capacity != null ? p.capacity.toLocaleString() : '—'}
                    </InfoRow>
                    <InfoRow icon={<Phone className='size-4' />} title='Contacts'>
                        {p.contacts.length === 0
                            ? '—'
                            : p.contacts.map((c) => (
                                  <div key={c.id}>
                                      {c.label && (
                                          <span className='text-muted-foreground'>{c.label}: </span>
                                      )}
                                      {c.phone}
                                  </div>
                              ))}
                    </InfoRow>
                    <InfoRow icon={<Crosshair className='size-4' />} title='Coordinates'>
                        <span className='tabular-nums'>
                            {lat.toFixed(5)}, {lng.toFixed(5)}
                        </span>
                    </InfoRow>
                    <InfoRow
                        icon={
                            p.is_active ? (
                                <CircleCheck className='size-4' />
                            ) : (
                                <CircleOff className='size-4' />
                            )
                        }
                        title='Status'
                    >
                        {p.is_active ? (
                            <Badge>Active</Badge>
                        ) : (
                            <Badge variant='secondary'>Inactive</Badge>
                        )}
                    </InfoRow>
                </div>

                <div className='flex flex-wrap items-center justify-end gap-1.5'>
                    <ConfirmDialog
                        title='Archive evacuation center?'
                        description={`“${p.name}” will be removed from the map and the resident app. You can restore it from the archive within 30 days, after which it is permanently deleted.`}
                        confirmLabel='Archive'
                        isPending={del.isPending}
                        onConfirm={() => del.mutate(p.id)}
                        trigger={
                            <Button
                                size='sm'
                                variant='ghost'
                                className='text-destructive hover:text-destructive'
                            >
                                <Archive />
                                Archive
                            </Button>
                        }
                    />
                    <CenterFormDialog
                        center={center}
                        trigger={
                            <Button size='sm' variant='outline'>
                                <Pencil />
                                Edit
                            </Button>
                        }
                    />
                    <Button size='sm' onClick={() => navigate(`/?center=${p.id}`)}>
                        <MapPinned />
                        Show in Map
                    </Button>
                </div>
            </div>

            <ImageLightbox images={urls} index={viewing} onIndexChange={setViewing} />
        </div>
    )
}

export default CenterCard
