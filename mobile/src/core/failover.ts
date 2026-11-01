/**
 * Primary → fallback API failover. When the primary is unreachable (network
 * error, timeout, gateway error, or an offline ngrok tunnel) the request is
 * retried once against `API_FALLBACK_URL`, and subsequent requests keep using the
 * fallback for `FALLBACK_TTL_MS` before the primary is tried again.
 *
 * Works by rewriting the URL prefix, so it covers both the shared `apiClient`
 * (relative URLs + baseURL) and the raw-axios auth/registration calls (absolute URLs).
 */
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'

import { API_BASE_URL, API_FALLBACK_URL } from './config'

const FALLBACK_TTL_MS = 2 * 60 * 1000
const GATEWAY_STATUSES = new Set([502, 503, 504])

let fallbackUntil = 0

type FailoverConfig = InternalAxiosRequestConfig & { _failedOver?: boolean }

const useFallbackNow = (): boolean => Date.now() < fallbackUntil

/** Swap the primary prefix for the fallback one on whichever field carries it. */
function retarget(config: InternalAxiosRequestConfig, from: string, to: string): void {
    if (config.url?.startsWith(from)) config.url = to + config.url.slice(from.length)
    if (config.baseURL?.startsWith(from)) config.baseURL = to + config.baseURL.slice(from.length)
}

function targetsPrimary(config: InternalAxiosRequestConfig): boolean {
    return !!(config.url?.startsWith(API_BASE_URL) || config.baseURL?.startsWith(API_BASE_URL))
}

function isUnreachable(error: AxiosError): boolean {
    const res = error.response
    if (!res) return true // network error / timeout
    return GATEWAY_STATUSES.has(res.status) || !!res.headers?.['ngrok-error-code']
}

export function installFailover(instance: AxiosInstance): void {
    if (!API_FALLBACK_URL || API_FALLBACK_URL === API_BASE_URL) return
    const fallback = API_FALLBACK_URL

    instance.interceptors.request.use((config) => {
        if (useFallbackNow()) retarget(config, API_BASE_URL, fallback)
        return config
    })

    instance.interceptors.response.use(undefined, async (error: AxiosError) => {
        const config = error.config as FailoverConfig | undefined
        if (!config || config._failedOver || !targetsPrimary(config) || !isUnreachable(error)) {
            return Promise.reject(error)
        }
        config._failedOver = true
        fallbackUntil = Date.now() + FALLBACK_TTL_MS
        retarget(config, API_BASE_URL, fallback)
        return instance.request(config)
    })
}
