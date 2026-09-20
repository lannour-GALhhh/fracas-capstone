import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/common/ui/input'
import type { RiskFeatureCollection } from '../types/api'

interface Props {
    data: RiskFeatureCollection | null
    onSelect: (id: number) => void
}

const MAX_RESULTS = 6

/** Barangay finder: type a name, pick a suggestion, map focuses it. */
const BarangaySearch = ({ data, onSelect }: Props) => {
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)

    const results = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q || !data) return []
        return data.features
            .filter((f) => f.properties.name.toLowerCase().includes(q))
            .slice(0, MAX_RESULTS)
    }, [data, query])

    const showSuggestions = open && results.length > 0

    const handlePick = (id: number, name: string) => {
        onSelect(id)
        setQuery(name)
        setOpen(false)
    }

    return (
        <div className='relative w-64'>
            <div className='relative flex items-center'>
                <Search className='text-muted-foreground pointer-events-none absolute left-3 size-3.5' />
                <Input
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setOpen(true)
                    }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setOpen(false)}
                    placeholder='Search barangay…'
                    aria-label='Search barangay'
                    className='bg-background/95 h-9 w-64 rounded-full pl-8 shadow-md backdrop-blur'
                />
            </div>
            {showSuggestions && (
                <div className='bg-popover ring-foreground/10 absolute top-full left-0 z-20 mt-1.5 flex w-64 flex-col gap-0.5 rounded-lg p-1 text-popover-foreground shadow-md ring-1'>
                    {results.map((f) => (
                        <button
                            key={f.properties.id}
                            type='button'
                            onMouseDown={(e) => e.preventDefault()} // keep input focus on click
                            onClick={() => handlePick(f.properties.id, f.properties.name)}
                            className='hover:bg-muted rounded-md px-2.5 py-1.5 text-left text-sm transition-colors'
                        >
                            {f.properties.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default BarangaySearch
