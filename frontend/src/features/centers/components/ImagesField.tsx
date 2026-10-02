import { useEffect, useRef, useState } from 'react'
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core'
import {
    SortableContext,
    arrayMove,
    rectSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ImagePlus, X } from 'lucide-react'
import { FieldLabel } from '@/common/ui/field'
import ImageLightbox from '@/common/components/ImageLightbox'
import type { CenterPhoto } from '@/features/gis/poi/types'

interface Props {
    /** Ordered photos (saved + newly picked); the first one is the MAIN photo. */
    photos: CenterPhoto[]
    onChange: (photos: CenterPhoto[]) => void
}

const Thumb = ({
    photo,
    isMain,
    onView,
    onRemove,
}: {
    photo: CenterPhoto
    isMain: boolean
    onView: () => void
    onRemove: () => void
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: photo.key,
    })

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={`relative aspect-square touch-none ${isDragging ? 'z-10 opacity-80' : ''}`}
            {...attributes}
            {...listeners}
        >
            <button
                type='button'
                aria-label='View photo'
                onClick={onView}
                className='size-full cursor-grab active:cursor-grabbing'
            >
                <img
                    src={photo.url}
                    alt='Center photo'
                    draggable={false}
                    className='size-full rounded-md object-cover'
                />
            </button>
            {isMain && (
                <span className='bg-primary text-primary-foreground pointer-events-none absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide'>
                    MAIN
                </span>
            )}
            <button
                type='button'
                aria-label='Remove photo'
                onClick={onRemove}
                // Keep the press from starting a drag.
                onPointerDown={(e) => e.stopPropagation()}
                className='bg-background/90 absolute -right-1.5 -top-1.5 rounded-full border p-0.5 shadow'
            >
                <X className='size-3' />
            </button>
        </div>
    )
}

/** Photo picker: drag to reorder (first = MAIN), click to enlarge, X to remove. */
const ImagesField = ({ photos, onChange }: Props) => {
    const [viewing, setViewing] = useState<number | null>(null)
    const sensors = useSensors(
        // A small distance keeps plain clicks (view photo) from being read as drags.
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )

    // Revoke object URLs of still-pending files when the field goes away.
    const latest = useRef(photos)
    useEffect(() => {
        latest.current = photos
    }, [photos])
    useEffect(() => {
        const ref = latest
        return () => ref.current.forEach((p) => p.file && URL.revokeObjectURL(p.url))
    }, [])

    const addFiles = (files: File[]) =>
        onChange([
            ...photos,
            ...files.map((file) => ({
                key: `new-${crypto.randomUUID()}`,
                url: URL.createObjectURL(file),
                file,
            })),
        ])

    const remove = (photo: CenterPhoto) => {
        if (photo.file) URL.revokeObjectURL(photo.url)
        onChange(photos.filter((p) => p.key !== photo.key))
    }

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return
        const from = photos.findIndex((p) => p.key === active.id)
        const to = photos.findIndex((p) => p.key === over.id)
        onChange(arrayMove(photos, from, to))
    }

    return (
        <div className='flex flex-col gap-2'>
            <FieldLabel>
                Photos <span className='text-black/40'>(drag to reorder)</span>
            </FieldLabel>
            <label className='hover:bg-muted flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground transition-colors'>
                <ImagePlus className='size-4' />
                Add photos
                <input
                    type='file'
                    accept='image/*'
                    multiple
                    className='hidden'
                    onChange={(e) => {
                        addFiles(Array.from(e.target.files ?? []))
                        e.target.value = '' // allow re-picking the same file after removing it
                    }}
                />
            </label>
            {photos.length > 0 && (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={onDragEnd}
                >
                    <SortableContext items={photos.map((p) => p.key)} strategy={rectSortingStrategy}>
                        <div className='grid grid-cols-4 gap-2'>
                            {photos.map((photo, i) => (
                                <Thumb
                                    key={photo.key}
                                    photo={photo}
                                    isMain={i === 0}
                                    onView={() => setViewing(i)}
                                    onRemove={() => remove(photo)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
            <ImageLightbox
                images={photos.map((p) => p.url)}
                index={viewing}
                onIndexChange={setViewing}
            />
        </div>
    )
}

export default ImagesField
