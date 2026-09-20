import axios from 'axios'

/** PSGC lookup client — a separate axios instance with no auth/refresh interceptor. */
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
