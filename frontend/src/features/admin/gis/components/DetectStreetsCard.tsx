import { Button } from '@/common/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/common/ui/card'
import { useDetectStreets } from '../../hooks/useGisImports'

interface Props {
    /** A street-detection job is pending/running. */
    processing: boolean
    /** Any GIS job is running; only one runs at a time. */
    disabled: boolean
}

/** Finds named streets crossing high / very high flood zones and saves them per barangay. */
const DetectStreetsCard = ({ processing, disabled }: Props) => {
    const detect = useDetectStreets()
    const busy = detect.isPending || processing

    return (
        <Card>
            <CardHeader>
                <CardTitle>3. High-risk streets</CardTitle>
                <CardDescription>
                    Searches OpenStreetMap for named streets crossing high and very high flood zones and saves them
                    per barangay. Needs internet access; replaces the existing list.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={() => detect.mutate()} disabled={busy || disabled}>
                    {busy ? 'Detecting…' : 'Detect high-risk streets'}
                </Button>
            </CardContent>
        </Card>
    )
}

export default DetectStreetsCard
