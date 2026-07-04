import axios from 'axios'

/**
 * Philippine Standard Geographic Code (PSGC) lookup client.
 *
 * A standalone axios instance — NOT our `apiClient` — because these calls go to
 * the public PSGC API, must not carry our auth token, and don't need the 401
 * refresh interceptor. The data is effectively static, so callers cache it hard.
 * Cascade: province → city/municipality → barangay.
 */
const psgc = axios.create({ baseURL: 'https://psgc.gitlab.io/api' })

/** A selectable PSGC place: its 9-digit code and display name. */
export interface PsgcPlace {
    code: string
    name: string
}

interface PsgcRow {
    code: string
    name: string
}

const toPlaces = (rows: PsgcRow[]): PsgcPlace[] =>
    rows
        .map((r) => ({ code: r.code, name: r.name }))
        .sort((a, b) => a.name.localeCompare(b.name))

/** All provinces. */
export const getProvinces = async (): Promise<PsgcPlace[]> => {
    const { data } = await psgc.get<PsgcRow[]>('/provinces/')
    return toPlaces(data)
}

/** Cities and municipalities under a province. */
export const getCities = async (provinceCode: string): Promise<PsgcPlace[]> => {
    const { data } = await psgc.get<PsgcRow[]>(`/provinces/${provinceCode}/cities-municipalities/`)
    return toPlaces(data)
}

/** Barangays under a city or municipality. */
export const getBarangays = async (cityCode: string): Promise<PsgcPlace[]> => {
    const { data } = await psgc.get<PsgcRow[]>(`/cities-municipalities/${cityCode}/barangays/`)
    return toPlaces(data)
}
