import { useState } from 'react'
import { Bell, CheckCircle2, Download, Loader2, MapPin, Waves } from 'lucide-react'
import { Button } from '@/common/ui/button'
import { Badge } from '@/common/ui/badge'
import { Card, CardContent } from '@/common/ui/card'

/** Download link comes from the env (VITE_APP_DOWNLOAD_URL), never hardcoded. */
const DOWNLOAD_URL: string | undefined = import.meta.env.VITE_APP_DOWNLOAD_URL

const FEATURES = [
    { icon: MapPin, title: 'Know your barangay', text: 'See the current flood risk level for your area on a live map.' },
    { icon: Bell, title: 'Get alerted early', text: 'Receive a notification the moment your barangay turns critical.' },
    { icon: Waves, title: 'Find safe ground', text: 'Locate the nearest evacuation centers when it matters.' },
]

const DownloadPage = () => {
    const [downloading, setDownloading] = useState(false)

    const handleDownload = () => {
        if (!DOWNLOAD_URL || downloading) return
        setDownloading(true)
        window.location.href = DOWNLOAD_URL
        // Browser gives no completion signal for a file download; reset after a moment.
        setTimeout(() => setDownloading(false), 4000)
    }

    return (
        <div className='min-h-screen w-full bg-blue-950 p-2'>
            <div className='mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-4xl flex-col rounded-2xl bg-white p-6 sm:p-10'>
                <header className='flex items-center gap-3'>
                    <span className='flex size-10 items-center justify-center rounded-xl bg-blue-950'>
                        <Waves className='size-5 text-blue-200' />
                    </span>
                    <span className='text-lg font-bold tracking-tight text-blue-950'>FRACAS</span>
                </header>

                <main className='flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center'>
                    <Badge variant='secondary'>Android app</Badge>
                    <h1 className='max-w-2xl text-4xl font-bold tracking-tight text-blue-950 sm:text-5xl'>
                        Flood warnings for Zamboanga City, in your pocket
                    </h1>
                    <p className='max-w-xl text-muted-foreground'>
                        FRACAS tracks rainfall and scores flood risk for every barangay every 15 minutes,
                        so you can act before the water rises.
                    </p>

                    <div className='flex flex-col items-center gap-2'>
                        <Button
                            size='lg'
                            className='h-11 bg-blue-950 px-6 text-base text-white hover:bg-blue-900'
                            onClick={handleDownload}
                            disabled={!DOWNLOAD_URL || downloading}
                        >
                            {downloading ? <Loader2 className='animate-spin' /> : <Download />}
                            {downloading ? 'Downloading...' : 'Download FRACAS'}
                        </Button>
                        {!DOWNLOAD_URL && (
                            <p className='text-sm text-muted-foreground'>The download link is not available yet.</p>
                        )}
                    </div>
                </main>

                <section className='grid gap-4 sm:grid-cols-3'>
                    {FEATURES.map(({ icon: Icon, title, text }) => (
                        <Card key={title}>
                            <CardContent className='flex flex-col gap-2'>
                                <Icon className='size-5 text-blue-950' />
                                <h2 className='font-semibold text-blue-950'>{title}</h2>
                                <p className='text-sm text-muted-foreground'>{text}</p>
                            </CardContent>
                        </Card>
                    ))}
                </section>

                <footer className='mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground'>
                    <CheckCircle2 className='size-3.5' /> Free for residents of Zamboanga City
                </footer>
            </div>
        </div>
    )
}

export default DownloadPage
