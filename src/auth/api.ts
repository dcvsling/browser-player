export interface ApiRequest {
    endpoint: string;
    forceRefresh?: boolean;
}
export namespace ApiRequest {
    // export const login: ApiRequest = {
    //     endpoint: `https://login.microsoftonline.com/consumers`,
    //     scopes: ["User.Read"],
    //     forceRefresh: false
    // // }
    export const Authorize: ApiRequest = {
      endpoint: `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize`,
    }
    export const Token: ApiRequest = {
      endpoint: `https://login.microsoftonline.com/consumers/oauth2/v2.0/token`,
    }
}
