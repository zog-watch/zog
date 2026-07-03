import { parseTorrentTitle } from '@viren070/parse-torrent-title';

import { DebridParsedStream } from './types';

interface StreamInput {
  title: string;
  url: string;
  [key: string]: unknown;
}

function guessContainer(url: string, title: string): string | undefined {
  const haystack = `${url} ${title}`.toLowerCase();
  if (haystack.includes('.mkv') || haystack.includes(' mkv')) return 'mkv';
  if (haystack.includes('.mp4') || haystack.includes(' mp4')) return 'mp4';
  if (haystack.includes('.webm')) return 'webm';
  return undefined;
}

function normalizeAudio(audio: string | string[] | undefined): string | undefined {
  if (!audio) return undefined;
  if (Array.isArray(audio)) return audio[0]?.toLowerCase();
  return audio.toLowerCase();
}

export function parseDebridStream(stream: StreamInput): DebridParsedStream {
  const title = stream.title?.trim() || '';
  const parsed = parseTorrentTitle(title);

  return {
    resolution: parsed.resolution,
    year: parsed.year ? Number.parseInt(parsed.year, 10) : undefined,
    source: parsed.quality,
    bitDepth: parsed.bitDepth,
    codec: parsed.codec?.toLowerCase(),
    audio: normalizeAudio(parsed.audio),
    container: parsed.container ?? guessContainer(stream.url, title),
    complete: parsed.complete,
    languages: parsed.languages,
    dubbed: parsed.dubbed,
    title,
    url: stream.url,
  };
}

export function parseDebridStreams(streams: StreamInput[]): DebridParsedStream[] {
  return streams.map(parseDebridStream);
}
