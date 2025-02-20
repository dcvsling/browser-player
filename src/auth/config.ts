import { Configuration, LogLevel, PublicClientApplication } from '@azure/msal-browser';
import { response } from 'express';

export const AUTH_PKCE_CONFIG_TOKEN = {
  "client_id": '4c18105a-e398-4e42-b815-864ee1dca919',
  "response_type": "code",
  "redirect_uri": "http://localhost:4200/auth",
  "response_mode": "query",
  "scope": "https://graph.microsoft.com/mail.read",
  "state": "12345",
  "code_challenge": "YTFjNjI1OWYzMzA3MTI4ZDY2Njg5M2RkNmVjNDE5YmEyZGRhOGYyM2IzNjdmZWFhMTQ1ODg3NDcxY2Nl",
  "code_challenge_method": "S256",
};
// import { ClassToken, ValueToken } from 'js-di';
/**
 * Configuration object to be passed to MSAL instance on creation.
 * For a full list of MSAL.js configuration parameters, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/configuration.md
 */
export const MSAL_CONFIG_TOKEN = {
  lifetime: 'singleton',
  name: 'MSAL_CONFIG_TOKEN',
  value: {
    auth: {
        clientId: "4c18105a-e398-4e42-b815-864ee1dca919",
        response_type: "code",
        authority: "https://login.microsoftonline.com/common/",
        redirectUri: "http://localhost:4200",
        postLogoutRedirectUri: "http://localhost:4200",
        validateAuthority: true,
        navigateToLoginRequestUrl: true
    },
    cache: {
        cacheLocation: "localStorage",
        storeAuthStateInCookie: false
    },
    system: {
        loggerOptions: { loggerCallback }
    }
  }
}

export function loggerCallback(level: LogLevel, message: string, containsPii: boolean) {
    if (containsPii) {
        return;
    }
    switch (level) {
        case LogLevel.Error:
            console.error(message);
            return;
        case LogLevel.Info:
            console.info(message);
            return;
        case LogLevel.Verbose:
            console.debug(message);
            return;
        case LogLevel.Warning:
            console.warn(message);
            return;
    }
}
