import { useState } from 'react'
import {
    ArrowRight,
    BadgeCheck,
    Bell,
    CloudRain,
    Download,
    Loader2,
    MapPin,
    Smartphone,
    Waves,
    Home,
    Gauge,
    Radar,
} from 'lucide-react'

/** Download link comes from the env (VITE_APP_DOWNLOAD_URL), never hardcoded. */
const DOWNLOAD_URL: string | undefined = import.meta.env.VITE_APP_DOWNLOAD_URL

const HIGHLIGHTS = [
    { icon: MapPin, title: 'Know Your Barangay', description: 'See the current flood risk level for your area on a live map.' },
    { icon: Bell, title: 'Get Alerted Early', description: 'Receive a notification the moment your barangay turns critical.' },
    { icon: Waves, title: 'Find Safe Ground', description: 'Locate the nearest evacuation centers when it matters.' },
]

const PROCESS_STEPS = [
    { step: '01', title: 'Collect Data', description: 'Rainfall readings are ingested every 15 minutes.', icon: CloudRain },
    { step: '02', title: 'Score Hazard', description: 'Each barangay gets their own flood risk hazard score.', icon: Gauge },
    { step: '03', title: 'Alert Residents', description: 'Subscribed residents are notified when risk turns critical or when evacuations are issued.', icon: Bell },
    { step: '04', title: 'Stay Safe', description: 'Go to the nearest evacuation center or outside the evacuation radius/zone.', icon: Home },
]

const BENEFITS = ['Live barangay risk map', 'Instant critical-level alerts', 'Nearest evacuation centers']

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
        <div className='min-h-screen w-full bg-blue-100/40 p-2'>
            <div className='flex w-full flex-col overflow-hidden rounded-xl bg-white shadow-sm'>
                {/* Hero */}
                <div className='relative min-h-[110vh] bg-linear-140 from-[#050f2a] via-[#0b1f54] to-[#123a7a] xl:min-h-[90vh]'>
                    <div className='mx-auto flex h-20 w-4/5 items-center justify-between'>
                        <span className='flex items-center gap-2 text-2xl font-bold tracking-tight'>
                            <Waves className='size-6 text-blue-300' />
                            <span className='text-white'>FRACAS</span>
                        </span>
                        <button
                            onClick={handleDownload}
                            disabled={!DOWNLOAD_URL || downloading}
                            className='group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-blue-200/60 px-8 py-2.5 font-semibold text-blue-100 before:absolute before:inset-y-0 before:left-0 before:w-0 before:bg-white/90 before:transition-all before:duration-300 hover:text-blue-950 hover:before:w-full disabled:cursor-not-allowed disabled:opacity-50'
                        >
                            <span className='relative z-10 flex items-center gap-4'>
                                {downloading ? <Loader2 size={18} className='animate-spin' /> : <Download size={18} />}
                                <span className='hidden md:block'>Download FRACAS</span>
                            </span>
                        </button>
                    </div>

                    <Waves size={240} className='absolute bottom-9 right-20 -skew-12 text-white/20 blur-md' />
                    <Radar size={240} className='absolute left-10 top-20 skew-y-12 text-white/5 blur' />

                    <div className='mx-auto mt-20 flex w-4/5'>
                        <div className='flex-1 flex flex-col items-center'>
                            <h1 className='text-center text-xl font-semibold capitalize text-blue-300'>Welcome to FRACAS</h1>
                            <div className='my-6 flex flex-col gap-2 text-center text-6xl font-extrabold tracking-tight text-white'>
                                <h2 className='text-shadow-lg text-shadow-blue-400/20'>Know the Risk</h2>
                                <h2 className='text-shadow-lg text-shadow-blue-400/20'>Before the Water Rises</h2>
                            </div>
                            <p className='my-4 w-1/2 text-center rounded-2xl border-2 border-blue-200/20 p-4.5 font-semibold text-blue-100'>
                                FRACAS tracks rainfall and scores flood risk for every barangay in Zamboanga City every 15 minutes,
                                so you can act early. Because staying safe begins with knowing what is coming.
                            </p>

                            <div className='mx-auto mt-4 flex w-5/6 max-w-sm gap-2'>
                                <button
                                    onClick={handleDownload}
                                    disabled={!DOWNLOAD_URL || downloading}
                                    className='flex flex-1 cursor-pointer flex-col items-center justify-center rounded-sm bg-blue-300 py-4.5 font-semibold text-black shadow-2xl shadow-blue-500/40 hover:-translate-y-0.5 hover:text-white hover:transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0'
                                >
                                    <span className='text-xs text-black/50'>{downloading ? 'Downloading...' : 'Download for'}</span>
                                    <span className='text-3xl font-extrabold tracking-tight'>ANDROID</span>
                                </button>
                            </div>
                            <h4 className='mt-4 text-center text-sm text-blue-300/60'>
                                {DOWNLOAD_URL ? 'Download for Free' : 'The download link is not available yet.'}
                            </h4>
                        </div>

                    </div>

                    <div className='absolute bottom-0 left-0 w-full overflow-hidden leading-none'>
                        <svg viewBox='0 0 1440 320' className='h-23.75 w-full' preserveAspectRatio='none'>
                            <path
                                fill='#ffffff'
                                d='M0,128L24,117.3C48,107,96,85,144,74.7C192,64,240,64,288,58.7C336,53,384,43,432,48C480,53,528,75,576,90.7C624,107,672,117,720,106.7C768,96,816,64,864,64C912,64,960,96,1008,133.3C1056,171,1104,213,1152,208C1200,203,1248,149,1296,133.3C1344,117,1392,139,1416,149.3L1440,160L1440,320L0,320Z'
                            />
                        </svg>
                    </div>
                </div>

                {/* Highlights */}
                <section className='mx-auto w-4/5 px-5 pb-6 pt-10 sm:px-8 md:pt-14'>
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
                        <div>
                            <h3 className='text-2xl font-extrabold text-blue-950 sm:text-3xl'>Built for Early Flood Warning</h3>
                        </div>
                        <p className='max-w-xl text-sm text-slate-600 sm:text-base'>
                            FRACAS is designed for residents who need clear, timely information, less guessing,
                            and confidence when the rain keeps falling.
                        </p>
                    </div>

                    <div className='mt-6 grid gap-4 md:grid-cols-3'>
                        {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
                            <article
                                key={title}
                                className='rounded-2xl border border-slate-200 bg-slate-50/60 p-5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/10'
                            >
                                <div className='inline-flex rounded-xl bg-blue-100 p-2.5 text-blue-900'>
                                    <Icon size={20} />
                                </div>
                                <h4 className='mt-4 text-lg font-bold text-blue-950'>{title}</h4>
                                <p className='mt-2 text-sm leading-relaxed text-slate-600'>{description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                {/* Flow */}
                <section className='mx-auto w-4/5 px-5 py-8 sm:px-8'>
                    <div className='flex flex-col gap-2'>
                        <h3 className='text-2xl font-extrabold text-blue-950 sm:text-3xl'>How FRACAS Works</h3>
                    </div>

                    <div className='mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                        {PROCESS_STEPS.map(({ step, title, description, icon: Icon }) => (
                            <article
                                key={step}
                                className='rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-lg hover:shadow-blue-900/10'
                            >
                                <div className='flex items-center justify-between'>
                                    <span className='text-sm font-medium text-blue-700'>{step}</span>
                                    <Icon size={18} className='text-blue-900' />
                                </div>
                                <h4 className='mt-4 text-lg font-bold text-blue-950'>{title}</h4>
                                <p className='mt-2 text-sm leading-relaxed text-slate-600'>{description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                {/* Mobile experience */}
                <section className='mx-auto w-4/5 px-5 py-8 sm:px-8'>
                    <div className='grid gap-6 rounded-3xl border border-slate-200 bg-linear-to-r from-white to-blue-50 p-6 lg:grid-cols-2 lg:p-8'>
                        <div className='space-y-4'>
                            <h3 className='text-2xl font-extrabold text-blue-950 sm:text-3xl'>Clear Screens, Fast Decisions</h3>
                            <p className='text-sm leading-relaxed text-slate-600 sm:text-base'>
                                The app keeps the most important information upfront: your barangay's risk level,
                                active alerts, and the closest evacuation center. Whether you are at home or on the move,
                                it stays quick and easy to read.
                            </p>

                            <ul className='space-y-2 text-sm font-semibold text-blue-950'>
                                {BENEFITS.map((benefit) => (
                                    <li key={benefit} className='flex items-center gap-2'>
                                        <BadgeCheck size={16} className='text-blue-700' /> {benefit}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className='grid gap-3 sm:grid-cols-2'>
                            <div className='flex h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-blue-900'>
                                <MapPin size={40} />
                                <span className='text-sm font-semibold'>Live risk map</span>
                            </div>
                            <div className='flex h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-blue-900'>
                                <Smartphone size={40} />
                                <span className='text-sm font-semibold'>Instant alerts</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className='mx-auto w-full px-5 pb-8 pt-2 sm:px-8'>
                    <div className='rounded-3xl bg-linear-to-r from-[#050f2a] via-[#0b1f54] to-[#123a7a] p-6 text-white sm:p-8'>
                        <div className='flex flex-col gap-5 md:flex-row md:items-center md:justify-between'>
                            <div>
                                <h3 className='text-2xl font-black tracking-tight sm:text-3xl'>Stay One Step Ahead of the Flood</h3>
                                <p className='mt-3 max-w-xl text-sm text-blue-100 sm:text-base'>
                                    Stop guessing and start acting early. FRACAS gives you clarity, timely alerts,
                                    and a safer path when the water rises.
                                </p>
                            </div>
                            <button
                                onClick={handleDownload}
                                disabled={!DOWNLOAD_URL || downloading}
                                className='inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-blue-300 px-5 py-3 text-sm font-extrabold text-blue-950 transition hover:-translate-y-0.5 hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0'
                            >
                                {downloading ? 'Downloading...' : 'Download FRACAS'}
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className='border-t border-slate-200 bg-slate-50'>
                    <div className='mx-auto grid w-full gap-6 px-5 py-8 sm:px-8 lg:grid-cols-2 lg:gap-10'>
                        <div>
                            <h4 className='text-sm font-black text-blue-950'>ABOUT FRACAS</h4>
                            <p className='mt-4 text-sm leading-relaxed text-slate-600'>
                                <strong>FRACAS</strong> is a flood-risk early-warning system for the barangays of Zamboanga City.
                                Every 15 minutes it ingests rainfall data, scores each barangay's flood hazard, and alerts
                                subscribed residents when a barangay turns critical.
                            </p>
                        </div>

                        <div className='rounded-3xl border border-slate-200 bg-white p-6 sm:p-8'>
                            <span className='mx-auto flex size-20 items-center justify-center rounded-2xl bg-blue-950'>
                                <Waves className='size-10 text-blue-200' />
                            </span>
                            <p className='mt-5 text-center text-sm font-semibold text-slate-600'>
                                FRACAS. Designed to make flood warnings clear, timely, and reliable.
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    )
}

export default DownloadPage
