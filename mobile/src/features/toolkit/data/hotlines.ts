import type { Hotline } from '../types'

/**
 * Emergency hotlines, ordered most-urgent first. `911` (national emergency) and
 * `143` (Philippine Red Cross) are nationwide short codes. City/agency numbers use
 * the Zamboanga area code (062).
 *
 * TODO(ops): verify every city-level number against the official CDRRMO directory
 * before release — hotlines change, and a wrong number in an emergency is worse
 * than none. Keeping them here (not on the server) is deliberate: the list must
 * work with no signal.
 */
export const HOTLINES: Hotline[] = [
    {
        id: 'national-911',
        name: 'National Emergency Hotline',
        agency: 'Nationwide',
        number: '911',
        dial: '911',
    },
    {
        id: 'cdrrmo',
        name: 'City Disaster Risk Reduction (CDRRMO)',
        agency: 'Zamboanga City',
        number: '(062) 992-2929',
        dial: '0629922929',
    },
    {
        id: 'red-cross',
        name: 'Philippine Red Cross',
        agency: 'Nationwide',
        number: '143',
        dial: '143',
    },
    {
        id: 'bfp',
        name: 'Fire Department',
        agency: 'Bureau of Fire Protection – Zamboanga',
        number: '(062) 991-2222',
        dial: '0629912222',
    },
    {
        id: 'pnp',
        name: 'Police',
        agency: 'PNP Zamboanga City',
        number: '(062) 991-4000',
        dial: '0629914000',
    },
    {
        id: 'coast-guard',
        name: 'Coast Guard',
        agency: 'PCG – Zamboanga Station',
        number: '(062) 992-7333',
        dial: '0629927333',
    },
    {
        id: 'health',
        name: 'City Health Office / Ambulance',
        agency: 'Zamboanga City',
        number: '(062) 991-1024',
        dial: '0629911024',
    },
    {
        id: 'zcwd',
        name: 'Water District (ZCWD)',
        agency: 'Zamboanga City Water District',
        number: '(062) 991-2879',
        dial: '0629912879',
    },
]
