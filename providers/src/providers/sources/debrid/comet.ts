import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';

import { getAddonStreams, parseStreamData } from './helpers';
import { DebridParsedStream, debridProviders } from './types';

export async function getCometStreams(
  token: string,
  debridProvider: debridProviders,
  ctx: MovieScrapeContext | ShowScrapeContext,
): Promise<DebridParsedStream[]> {
  const cometBaseUrl = 'https://comet.zog.watch';
  const cometStreamsRaw = (await getAddonStreams(cometBaseUrl, ctx)).streams;
  const newStreams: { title: string; url?: string; infoHash?: string; fileIdx?: number }[] = [];

  for (let i = 0; i < cometStreamsRaw.length; i++) {
    const raw = cometStreamsRaw[i];
    if (raw.description !== undefined)
      newStreams.push({
        title: (raw.description as string).replace(/\n/g, ''),
        url: raw.url,
        infoHash: raw.infoHash,
        fileIdx: raw.fileIdx,
      });
  }
  const parsedData = await parseStreamData(newStreams, ctx);
  return parsedData;
}
