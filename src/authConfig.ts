import { LogLevel, PublicClientApplication, type Configuration } from '@azure/msal-browser'

const tenantId = import.meta.env.VITE_AAD_TENANT_ID
const clientId = import.meta.env.VITE_AAD_CLIENT_ID
export const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH === 'true'

export const msalConfig: Configuration = {
  auth: {
    clientId: clientId ?? '',
    authority: `https://login.microsoftonline.com/${tenantId ?? 'common'}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Info,
      loggerCallback: () => {
        /* keep logs out of console in production; wire to telemetry if needed */
      },
    },
  },
}

export const pca = new PublicClientApplication(msalConfig)
