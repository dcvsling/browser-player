import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { VideoMetadata } from '../graph';
import { createFFMpeg } from './init';


export async function transcode(metadata: VideoMetadata): Promise<string> {
  const ffmpeg = await createFFMpeg();
  await ffmpeg.writeFile(metadata.name, await fetchFile(metadata['@microsoft.graph.downloadUrl']));
  await ffmpeg.exec(['-i', metadata.name, metadata.name + '.mp4']);
  const data = await ffmpeg.readFile(metadata.name + '.mp4');
  return URL.createObjectURL(new Blob([data], {type: 'video/mp4'}));

}
