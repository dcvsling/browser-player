

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
    large: { height: number, url: string, width: number };
    medium: { height: number, url: string, width: number };
    small: { height: number, url: string, width: number };
  }[];
}
export interface DriveResponse<T> {
  [`@odata.context`]: string;
  [`@odata.count`]: number;
  [`@odata.nextLink`]: string;
  value: T[];
}
