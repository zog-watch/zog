import { Flags } from '@/entrypoint/utils/targets';
import { Caption } from '@/providers/captions';

export type StreamFile = {
  type: 'mp4';
  url: string;
  // optional debrid hints for cache/services that need to re-unrestrict the
  // link on their side
  debridInfoHash?: string;
  debridFileIdx?: number;
};

export type FileAudioVariant = {
  id: string;
  label: string;
  language: string;
  qualities: Partial<Record<Qualities, StreamFile>>;
};

export type Qualities = 'unknown' | '360' | '480' | '720' | '1080' | '4k';

type ThumbnailTrack = {
  type: 'vtt';
  url: string;
};

type StreamCommon = {
  id: string; // only unique per output
  flags: Flags[];
  captions: Caption[];
  thumbnailTrack?: ThumbnailTrack;
  headers?: Record<string, string>; // these headers HAVE to be set to watch the stream
  preferredHeaders?: Record<string, string>; // these headers are optional, would improve the stream
  skipValidation?: boolean; // skip stream validation if true
  // debrid provider hints (TorBox / Real-Debrid) so a downstream cache can
  // re-unrestrict a fresh, non-IP-locked download URL
  debridInfoHash?: string;
  debridFileIdx?: number;
};

export type FileBasedStream = StreamCommon & {
  type: 'file';
  qualities: Partial<Record<Qualities, StreamFile>>;
  audioVariants?: FileAudioVariant[];
};

export type HlsBasedStream = StreamCommon & {
  type: 'hls';
  playlist: string;
  proxyDepth?: 0 | 1 | 2;
};

export type Stream = FileBasedStream | HlsBasedStream;
