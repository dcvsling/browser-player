export interface Thumbnail {
  height: number;
  url: string;
  width: number;
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
  video: {
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
  };
  thumbnails: {
    id: string;
    large: Thumbnail;
    medium: Thumbnail;
    small: Thumbnail;
  }[];
}


export interface DriveResponse<T> {
  [`@odata.context`]: string;
  [`@odata.count`]: number;
  [`@odata.nextLink`]: string;
  value: T[];
}


export interface VideoSource {
  src: string;
  title: string;
  thumb: {
    grid: Thumbnail,
    row: Thumbnail
  }
  size: number;
  mimeType: string;
}

export function ToViduoSource(video: VideoMetadata): VideoSource {
  return {
    src: video["@microsoft.graph.downloadUrl"],
    title: video.name,
    thumb: {
      grid: video.thumbnails[0].large,
      row: video.thumbnails[0].small
    },
    size: video.size,
    mimeType: video.file.mimeType
  };
}
