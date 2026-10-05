import apiClient from '@/app/apiClient'

export interface ActivationInfo {
    suggested_username: string
    first_name: string
}

/** Check an emailed activation link before showing the set-password form. */
export const verifyActivation = async (token: string): Promise<ActivationInfo> => {
    const { data } = await apiClient.post<ActivationInfo>('/api/auth/account-activation/verify/', {
        token,
    })
    return data
}

/** Set the chosen username + password and activate the account. */
export const completeActivation = (payload: {
    token: string
    username: string
    new_password: string
}) =>
    apiClient.post('/api/auth/account-activation/', payload)
