import { format } from 'date-fns'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/common/ui/badge'
import { cn } from '@/common/utils/utils'
import capitalize from '@/common/utils/capitalize'
import type { BarangayTestResponse } from '../../types/barangayTest'
import BarangayTestChart from './BarangayTestChart'

const fmt = (iso: string) => format(new Date(iso), 'MMM d, yyyy h:mm a')

const Stat = ({ label, value }: { label: string; value: string }) => (
    <div className='rounded-md border border-border p-3'>
        <p className='text-xs text-black/50'>{label}</p>
        <p className='mt-0.5 text-sm font-medium'>{value}</p>
    </div>
)

/** Verdict, key numbers and the hourly chart for one finished test. */
const BarangayTestResult = ({ data }: { data: BarangayTestResponse }) => {
    const { result: r, params: p, config } = data
    const ok = r.success
    const Icon = ok ? CheckCircle2 : XCircle
    const lead = r.lead_hours

    return (
        <div className='grid gap-4'>
            <div
                className={cn(
                    'flex items-start gap-3 rounded-lg border p-4',
                    ok ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50',
                )}
            >
                <Icon className={cn('mt-0.5 size-6 shrink-0', ok ? 'text-emerald-600' : 'text-red-600')} />
                <div>
                    <p className='text-lg font-semibold'>
                        {ok ? 'Detected' : 'Missed'} — {data.barangay.name}
                    </p>
                    <p className='text-sm text-black/70'>
                        {ok
                            ? `The system reached ${capitalize(p.min_category)} at ${fmt(r.first_detection_at!)}, ${
                                  lead === 0 ? 'at the flood hour' : `${lead}h before the flood`
                              }.`
                            : `The system never reached ${capitalize(p.min_category)} (score ${p.score_needed}) between ${fmt(
                                  p.window_start,
                              )} and ${fmt(p.window_end)}. Its highest score there was ${r.peak_score_in_window} (${
                                  r.peak_category_in_window
                              }).`}
                    </p>
                </div>
            </div>

            <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
                <Stat label='Flood declared' value={fmt(p.mark)} />
                <Stat label='Test window' value={`${p.hours_before}h before → ${p.hours_after}h after`} />
                <Stat label='Peak score in window' value={`${r.peak_score_in_window} (${r.peak_category_in_window})`} />
                <Stat label='Needed to detect' value={`${p.score_needed} (${capitalize(p.min_category)})`} />
                <Stat label='Peak rain in window' value={`${r.peak_rain_mm_hr_in_window} mm/h`} />
                <Stat label='Peak 24h rain in window' value={`${r.peak_accumulated_24hr_in_window} mm`} />
                <Stat label='Flagged outside window' value={`${r.flagged_hours_outside_window} h`} />
                <Stat label='Hours scored' value={String(r.hours_scored)} />
            </div>

            <div className='flex flex-wrap items-center gap-2 text-xs text-black/60'>
                <Badge variant='outline'>Config: {config.name}</Badge>
                <Badge variant='outline'>Zones: {config.aggregation.replace('_', '-')}</Badge>
                <Badge variant='outline'>Thresholds {config.thresholds.medium}/{config.thresholds.high}/{config.thresholds.critical}</Badge>
                <Badge variant='outline'>{p.forecast_lookahead ? 'With 4h forecast' : 'No forecast peeking'}</Badge>
            </div>

            {data.warnings.length > 0 && (
                <ul className='list-disc rounded-md border border-amber-300 bg-amber-50 p-3 pl-7 text-sm text-amber-900'>
                    {data.warnings.map((w) => (
                        <li key={w}>{w}</li>
                    ))}
                </ul>
            )}

            <div>
                <BarangayTestChart data={data} />
                <p className='mt-1 text-xs text-black/50'>
                    Blue bars: rain (mm/h). Red line: risk score (0–100); dashed red = score needed. Amber band: test
                    window. Dark dashed line: declared flood.
                </p>
            </div>
        </div>
    )
}

export default BarangayTestResult
