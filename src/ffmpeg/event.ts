import { VideoMetadata } from "../graph";

export interface FFMpegEvent {
  onloaded: () => void;
  onDownloadBegin: (data: VideoMetadata) => void;
  onDownloadProgress: (data: { time: number, progress: number }) => void;
  onDownloadCompleted: (data: VideoMetadata) => void;
  onDownloadError: (data: VideoMetadata) => void;
  onTranscodeStart: (data: VideoMetadata) => void;
  onTranscodeProgress: (data: { time: number, progress: number }) => void;
  onTranscodeStop: (data: VideoMetadata) => void;
  onUploadBegin: (data: VideoMetadata) => void;
  onUploadProgress: (data: { time: number, progress: number }) => void;
  onUploadCompleted: (data: VideoMetadata) => void;
}
