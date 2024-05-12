import { VideoMetadata } from "./video";

export interface ApiRequest {
    endpoint: string;
    scopes: string[];
    forceRefresh?: boolean;
}

export namespace ApiRequest {
    export const me: ApiRequest = {
        endpoint: `https://graph.microsoft.com/v1.0/me`,
        scopes: ["User.Read"]
    };
    export const files: ApiRequest = {
        endpoint: `https://graph.microsoft.com/v1.0/me/drive/items/B2D7A30C38920DE8!134726/children?$expand=thumbnails`,
        scopes: ["User.Read", "Files.Read", "Files.Read.All"],
        forceRefresh: true
    };
}
