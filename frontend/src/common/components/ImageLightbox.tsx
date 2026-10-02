import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/common/ui/dialog'
import { Button } from '@/common/ui/button'

interface Props {
    images: string[]
    /** Index being shown, or null when closed. */
    index: number | null
    onIndexChange: (index: number | null) => void
}

/** Full-size photo viewer with prev/next when there are several images. */
const ImageLightbox = ({ images, index, onIndexChange }: Props) => {
    const open = index !== null && images[index] !== undefined
    const step = (delta: number) =>
        onIndexChange((((index ?? 0) + delta) % images.length + images.length) % images.length)

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onIndexChange(null)}>
            <DialogContent
                className='flex h-[70vh] w-[70vw] max-w-[70vw] flex-col items-center gap-3 p-3 sm:max-w-[70vw]'
                onKeyDown={(e) => {
                    if (images.length < 2) return
                    if (e.key === 'ArrowLeft') step(-1)
                    if (e.key === 'ArrowRight') step(1)
                }}
            >
                <DialogTitle className='sr-only'>Center photo</DialogTitle>
                {open && (
                    <img
                        src={images[index]}
                        alt='Center photo'
                        className='min-h-0 w-full flex-1 rounded-md object-contain'
                    />
                )}
                {images.length > 1 && index !== null && (
                    <div className='flex items-center gap-3 text-sm text-black/60'>
                        <Button type='button' size='icon' variant='outline' aria-label='Previous photo' onClick={() => step(-1)}>
                            <ChevronLeft className='size-4' />
                        </Button>
                        {index + 1} / {images.length}
                        <Button type='button' size='icon' variant='outline' aria-label='Next photo' onClick={() => step(1)}>
                            <ChevronRight className='size-4' />
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

export default ImageLightbox
