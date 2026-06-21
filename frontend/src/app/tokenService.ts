type token = string | null;

let _accessToken: token = null;

const tokenService = {
    getAccess: (): token => _accessToken,

    setAccess: (token: token): void => { _accessToken = token },

    clearAccess: (): void => { _accessToken = null },
}

export default tokenService