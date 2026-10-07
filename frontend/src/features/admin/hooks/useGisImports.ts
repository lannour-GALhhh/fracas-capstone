import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getActiveLayers, listGisImports, uploadGisImport } from '../api/gisImportApi'
import type { GisImportKind } from '../types/gisImport'
import { adminKeys } from './queryKeys'

const ACTIVE = ['pending', 'running']

/** Recent imports; polls every 2s while one is still processing. */
export const useGisImports = () => {
    const queryClient = useQueryClient()
    const query = useQuery({
        queryKey: adminKeys.gisImports(),
        queryFn: listGisImports,
        refetchInterval: (q) => (q.state.data?.some((j) => ACTIVE.includes(j.status)) ? 2000 : false),
    })

    // When a running job finishes, tell the user and refresh every map layer.
    const seen = useRef<Map<number, string>>(new Map())
    useEffect(() => {
        for (const job of query.data ?? []) {
            const before = seen.current.get(job.id)
            seen.current.set(job.id, job.status)
            if (!before || !ACTIVE.includes(before)) continue
            if (job.status === 'succeeded') {
                toast.success('GIS import finished', { description: job.filename })
                queryClient.invalidateQueries({ queryKey: ['gis'] })
                queryClient.invalidateQueries({ queryKey: adminKeys.gisActive() })
            } else if (job.status === 'failed') {
                toast.error('GIS import failed', { description: job.message })
            }
        }
    }, [query.data, queryClient])

    return query
}

export const useUploadGisImport = (onProgress?: (percent: number) => void) => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ kind, file }: { kind: GisImportKind; file: File }) =>
            uploadGisImport(kind, file, onProgress),
        onSuccess: () => {
            toast.success('Upload received', { description: 'Processing in the background.' })
            queryClient.invalidateQueries({ queryKey: adminKeys.gisImports() })
        },
        onError: (err: { response?: { data?: { detail?: string; file?: string[] } } }) => {
            const data = err.response?.data
            toast.error("Couldn't upload the file", {
                description: data?.detail ?? data?.file?.[0] ?? 'Please try again.',
            })
        },
    })
}

/** Files currently in use per layer. */
export const useActiveLayers = () =>
    useQuery({ queryKey: adminKeys.gisActive(), queryFn: getActiveLayers })
