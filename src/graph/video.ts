
import { ApiRequest } from "./api";

export const VIDEO_SOURCE = Symbol.for("VIDEO_SOURCE");
export const THUMBNAILS = Symbol.for("VIDEO_THUMBNAILS");

export interface ThumbnailMap {
    id: string;
    large: Thumbnail;
    medium: Thumbnail;
    small: Thumbnail;
  }

export interface Thumbnail {
  height: number;
  url: string;
  width: number;
}

export function isThumbnail(data: any): data is Thumbnail {
  return data
    && 'height' in data
    && 'url' in data
    && 'width' in data
    && typeof data.height === 'number'
    && typeof data.width === 'number'
    && typeof data.url === 'string'
}

export interface VideoInformation {
  bitrate: number;
  duration: number;
  height: number;
  width: number;
  audioBitsPerSample: number;
  audioChannels: number;
  audioFormat: string;
  audioSamplesPerSecond: number;
  fourCC: string;
  frameRate: number;
}

export interface VideoMetadata {
  ["@microsoft.graph.downloadUrl"]: string
  createdDateTime: string;
  cTag: string;
  eTag: string;
  id: string;
  lastModifiedDateTime: string;
  name: string;
  size: number;
  webUrl: string;
  file: { mimeType: string };
  video: VideoInformation;
  thumbnails: ThumbnailMap[];
}

export interface VideoSource {
  id: string;
  title: string;
  size: number;
  duration: number;
  mimeType: string;
  video: VideoInformation
  // thumbnail: {
  //   id: string,
  //   height: number;
  //   url: string;
  //   width: number;
  // }| undefined
}

export interface DriveResponse<T> {
  [`@odata.context`]: string;
  [`@odata.count`]: number;
  [`@odata.nextLink`]: string;
  value: T[];
}
export function ToViduoSource(video: VideoMetadata): VideoSource {
    return {
        id: video.id,
        title: video.name,
        size: video.size,
        mimeType: video.file.mimeType,
        duration: video.video?.duration ? video.size / video.video.duration : -1,
        video: video.video//,
        // thumbnail: video.thumbnails ? {
        //   id: video.thumbnails[0].id,
        //   url: video.thumbnails[0].large.url,
        //   width: video.thumbnails[0].large.width,
        //   height: video.thumbnails[0].large.height,
        // } : undefined
      };
}

export function getThumbnailsUrl(video: VideoSource): string {
  return `https://graph.microsoft.com/v1.0/drives/B2D7A30C38920DE8/items/${video.id}/thumbnails`;
}

export function getVideoSourceUrl(video: VideoSource): string {
  return `https://graph.microsoft.com/v1.0/drives/B2D7A30C38920DE8/items/${video.id}?$select=content.downloadUrl`;
}

export interface VideoCache {
  metadata: VideoMetadata;
  source:{url: string, expire: number};
  thumbnails: string;
}
