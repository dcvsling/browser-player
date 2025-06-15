import { VideoMetadata } from "./video";

export interface ApiRequest {
    endpoint: string;
    scopes: string[];
    forceRefresh?: boolean;
    parameters?: {
      $select?: string[],
      $filter?: string,
      $expand?: string,
      $top?: number,
      $skip?: number,
    };
}

export namespace ApiRequest {

    export const me: ApiRequest = {
        endpoint: `https://graph.microsoft.com/v1.0/me`,
        scopes: ["https://graph.microsoft.com/User.Read"]
    };
    export const files: ApiRequest = {

        endpoint: `https://graph.microsoft.com/v1.0/drives/B2D7A30C38920DE8/items/B2D7A30C38920DE8!134726/children`,
        scopes: [
          "https://graph.microsoft.com/User.Read",
          "https://graph.microsoft.com/Files.Read",
          "https://graph.microsoft.com/Files.Read.All"
        ],
        forceRefresh: true,
        parameters: {
          $expand: 'thumbnails',
          $select: [
            "id",
            "thumbnails",
            "name",
            "file",
            "size",
            "video",
            "video.duration"
          ],
          $top: 1000
          // $filter: `value/any(prop:file/mimeType eq 'video/ma4')`
        }
    };

    export const file: ApiRequest = {
        endpoint: `https://graph.microsoft.com/v1.0/drives/B2D7A30C38920DE8/items/`,
        scopes: [
          "https://graph.microsoft.com/User.Read",
          "https://graph.microsoft.com/Files.Read",
          "https://graph.microsoft.com/Files.Read.All"
        ],
        forceRefresh: true,
        parameters: {
          $select: [
            "content.downloadUrl",
          ]
        }
    }

}
