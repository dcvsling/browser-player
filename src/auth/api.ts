export interface ApiRequest {
    endpoint: string;
    scopes: string[];
    forceRefresh?: boolean;
}

export namespace ApiRequest {
    export const login: ApiRequest = {
        endpoint: `https://login.microsoftonline.com/consumers`,
        scopes: ["User.Read"],
        forceRefresh: false

    }
}
