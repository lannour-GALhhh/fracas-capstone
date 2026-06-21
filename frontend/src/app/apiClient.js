import axios from 'axios'
import tokenService from './tokenService'

const BASE_URL = import.meta.env.VITE_API_URL

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    },
})


apiClient.interceptors.request.use(
    (config) => {
        const token = tokenService.getAccess();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
)

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((process) => error ? process.reject(error) : process.resolve(token));
    failedQueue = [];
}

apiClient.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return apiClient(originalRequest);
                    })
                    .catch((error) => Promise.reject(error))
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const { data } = await axios.post(
                    `${BASE_URL}/api/auth/jwt/refresh/`,
                    {},
                    { withCredentials: true }
                )

                tokenService.setAccess(data.access)
                processQueue(null, data.access);

                originalRequest.headers.Authorization = `Bearer ${data.access}`
                return apiClient(originalRequest);
            } catch (refreshError) {
                tokenService.clearAccess();
                processQueue(refreshError, null);

                window.dispatchEvent(new Event('fracas:session-expired'));

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;