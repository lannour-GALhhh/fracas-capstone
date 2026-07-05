/**
 * Axios instance for the FRACAS API. A near-verbatim port of the web
 * `apiClient`: attaches the in-memory access token, and on a 401 transparently
 * refreshes once (queuing concurrent requests during the refresh). Deltas for
 * mobile: sends `X-Client: mobile` (so the backend returns/accepts the refresh
 * token in the body), reads the refresh token from SecureStore, and signals
 * `sessionEvents` instead of a `window` event on refresh failure.
 */
import axios, {
    type AxiosError,
    type AxiosRequestConfig,
    type InternalAxiosRequestConfig,
} from 'axios'

import { API_BASE_URL } from './config'
import { sessionEvents } from './sessionEvents'
import { tokenService } from './tokenService'

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
        'X-Client': 'mobile',
    },
})

apiClient.interceptors.request.use((config) => {
    const token = tokenService.getAccess()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

type QueuedRequest = {
    resolve: (token: string) => void
    reject: (error: unknown) => void
}

let isRefreshing = false
let failedQueue: QueuedRequest[] = []

const processQueue = (error: unknown, token: string | null): void => {
    failedQueue.forEach((request) =>
        error || !token ? request.reject(error) : request.resolve(token),
    )
    failedQueue = []
}

/** Requests carry a private `_retry` guard so we never loop on a repeated 401. */
type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetriableConfig | undefined

        if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
            return Promise.reject(error)
        }

        if (isRefreshing) {
            return new Promise<string>((resolve, reject) => {
                failedQueue.push({ resolve, reject })
            }).then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`
                return apiClient(originalRequest as AxiosRequestConfig)
            })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
            const refresh = await tokenService.getRefresh()
            if (!refresh) throw new Error('No refresh token')

            const { data } = await axios.post(
                `${API_BASE_URL}/api/auth/jwt/refresh/`,
                { refresh },
                { headers: { 'X-Client': 'mobile' } },
            )

            tokenService.setAccess(data.access)
            if (data.refresh) await tokenService.saveRefresh(data.refresh)
            processQueue(null, data.access)

            originalRequest.headers.Authorization = `Bearer ${data.access}`
            return apiClient(originalRequest as AxiosRequestConfig)
        } catch (refreshError) {
            tokenService.clearAccess()
            await tokenService.clearRefresh()
            processQueue(refreshError, null)
            sessionEvents.emitExpired()
            return Promise.reject(refreshError)
        } finally {
            isRefreshing = false
        }
    },
)

export default apiClient
