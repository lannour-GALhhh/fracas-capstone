import { useRef, useState, type DragEvent } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/common/ui/card'
import { Skeleton } from '@/common/ui/skeleton'
import { Button } from '@/common/ui/button'
import { Badge } from '@/common/ui/badge'
import { useActiveLayers, useUploadGisImport } from '../../hooks/useGisImports'
import type { GisImportKind } from '../../types/gisImport'

interface Props {
    kind: GisImportKind
    title: string
    description: string
    /** A server-side job of this kind is pending/running. */
    processing?: boolean
    disabled?: boolean
}

/** Full-width status bar: filled to `percent`, or an animated sweep when progress is unknown. */
const StatusBar = ({ label, percent }: { label: string; percent?: number }) => (
    <div
        role='progressbar'
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className='relative h-9 w-full overflow-hidden rounded-md border bg-muted'
    >
        <div
            className={`absolute inset-y-0 left-0 bg-primary/30 ${
                percent === undefined ? 'w-1/3 animate-pulse' : 'transition-all'
            }`}
            style={percent === undefined ? { left: '33%' } : { width: `${percent}%` }}
        />
        <span className='relative flex h-full items-center justify-center text-sm font-medium'>{label}</span>
    </div>
)

/** One upload slot: pick a .zip, send it, show upload progress. */
const UploadCard = ({ kind, title, description, processing, disabled }: Props) => {
    const input = useRef<HTMLInputElement>(null)
    const [file, setFile] = useState<File | null>(null)
    const [percent, setPercent] = useState(0)
    const upload = useUploadGisImport(setPercent)
    const { data: active, isLoading } = useActiveLayers()
    const current = active?.[kind] ?? null
    const [dragging, setDragging] = useState(false)
    const busy = upload.isPending || !!processing

    const pick = (f: File | null | undefined) => f && setFile(f)
    const onDrop = (e: DragEvent<HTMLLabelElement>) => {
        e.preventDefault()
        setDragging(false)
        if (!busy) pick(e.dataTransfer.files[0])
    }

    const submit = () => {
        if (!file) return
        setPercent(0)
        upload.mutate(
            { kind, file },
            {
                onSuccess: () => {
                    setFile(null)
                    if (input.current) input.current.value = ''
                },
            },
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-3'>
                <div className='rounded-md border bg-muted/40 p-3 text-sm'>
                    <p className='text-xs text-muted-foreground'>File in use</p>
                    {isLoading ? (
                        <Skeleton className='mt-1 h-9' />
                    ) : current ? (
                        <div className='flex items-start justify-between gap-3'>
                            <div className='min-w-0'>
                                <p className='truncate font-medium'>{current.filename}</p>
                                <p className='text-xs text-muted-foreground'>
                                    {current.in_use_since
                                        ? `In use since ${new Date(current.in_use_since).toLocaleString()}`
                                        : 'In use since: date not recorded'}
                                    {` · ${current.records} ${kind === 'boundary' ? 'barangays' : 'zones'}`}
                                </p>
                            </div>
                            <Badge variant='outline'>{current.source === 'upload' ? 'Uploaded' : 'Server setup'}</Badge>
                        </div>
                    ) : (
                        <p className='font-medium text-destructive'>No file loaded</p>
                    )}
                </div>
                <label
                    onDragOver={(e) => {
                        e.preventDefault()
                        setDragging(true)
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    className={`flex min-h-32 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                        busy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted/50'
                    } ${dragging ? 'border-primary bg-muted/50' : 'border-border'}`}
                >
                    <input
                        ref={input}
                        type='file'
                        accept='.zip'
                        className='sr-only'
                        disabled={busy}
                        onChange={(e) => pick(e.target.files?.[0])}
                    />
                    {file ? (
                        <>
                            <span className='max-w-full truncate text-sm font-medium'>{file.name}</span>
                            <span className='text-xs text-muted-foreground'>
                                {(file.size / 1e6).toFixed(1)} MB · click to choose a different file
                            </span>
                        </>
                    ) : (
                        <>
                            <span className='text-sm font-medium'>Click to choose a file</span>
                            <span className='text-xs text-muted-foreground'>or drag a .zip here</span>
                        </>
                    )}
                </label>

                <div className='flex justify-center'>
                    {upload.isPending ? (
                        <StatusBar label={`Uploading ${percent}%`} percent={percent} />
                    ) : processing ? (
                        <StatusBar label='Processing on server…' />
                    ) : (
                        <Button size='sm' onClick={submit} disabled={!file || disabled}>
                            Upload &amp; process
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default UploadCard
