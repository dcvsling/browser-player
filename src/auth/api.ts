export interface ApiRequest {
    endpoint: string;
    scopes: string[];
    forceRefresh?: boolean;
}
export namespace ApiRequest {
    // export const login: ApiRequest = {
    //     endpoint: `https://login.microsoftonline.com/consumers`,
    //     scopes: ["User.Read"],
    //     forceRefresh: false
    // // }
    export const Authorize: ApiRequest = {
      endpoint: `https://login.microsoftonline.com/55604d97-faf8-4a3c-8f8d-c7a4fbc9b8b6/oauth2/v2.0/authorize`,
      scopes: ["User.Read"],
      forceRefresh: false
    }
    export const Token: ApiRequest = {
      endpoint: `https://login.microsoftonline.com/55604d97-faf8-4a3c-8f8d-c7a4fbc9b8b6/oauth2/v2.0/token`,
      scopes: ["user.read"]
    }
}
