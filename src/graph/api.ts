import { VideoMetadata } from "./video";

export interface ApiRequest {
    endpoint: string;
    scopes: string[];
    forceRefresh?: boolean;
}

export namespace ApiRequest {

    export const me: ApiRequest = {
        endpoint: `https://graph.microsoft.com/v1.0/me`,
        scopes: ["https://graph.microsoft.com/User.Read"]
    };
    export const files: ApiRequest = {

        endpoint: `https://graph.microsoft.com/v1.0/drives/B2D7A30C38920DE8/items/B2D7A30C38920DE8!134726/children?$expand=thumbnails`,
        scopes: [
          "https://graph.microsoft.com/User.Read",
          "https://graph.microsoft.com/Files.Read",
          "https://graph.microsoft.com/Files.Read.All"
        ],
        forceRefresh: true
    };
}
