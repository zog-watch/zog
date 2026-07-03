/* eslint-disable no-console */
import { flags } from '@/entrypoint/utils/targets';
import { SourcererOutput, makeSourcerer } from '@/providers/base';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';

import { getCometStreams } from './comet';
import { getAddonStreams, parseStreamData } from './helpers';
import { DebridParsedStream, debridProviders } from './types';

const OVERRIDE_TOKEN = 'cfafb527-29bd-42fe-a4aa-3799b0f48bd4';
const OVERRIDE_SERVICE: debridProviders | '' = 'torbox';

const getDebridToken = (): string | null => {
  try {
    if (OVERRIDE_TOKEN) return OVERRIDE_TOKEN;
  } catch {
    // Ignore
  }
  try {
    if (typeof window === 'undefined') return null;
    const prefData = window.localStorage.getItem('__MW::preferences');
    if (!prefData) return null;
    const parsedAuth = JSON.parse(prefData);
    return parsedAuth?.state?.debridToken || null;
  } catch (e) {
    console.error('Error getting debrid token:', e);
    return null;
  }
};

// torbox or realdebrid (coverted to `real-debrid` which is the type for torrentio)
const getDebridService = (): debridProviders => {
  try {
    if (OVERRIDE_SERVICE) return OVERRIDE_SERVICE as debridProviders;
  } catch {
    // Ignore
  }
  try {
    if (typeof window === 'undefined') return 'real-debrid';
    const prefData = window.localStorage.getItem('__MW::preferences');
    if (!prefData) return 'real-debrid';
    const parsedPrefs = JSON.parse(prefData);
    const saved = parsedPrefs?.state?.debridService;
    if (saved === 'realdebrid' || !saved) return 'real-debrid';
    return saved as debridProviders;
  } catch (e) {
    console.error('Error getting debrid service (defaulting to real-debrid):', e);
    return 'real-debrid';
  }
};

function normalizeQuality(resolution?: string): '4k' | 1080 | 720 | 480 | 360 | 'unknown' {
  if (!resolution) return 'unknown';
  const res = resolution.toLowerCase();
  if (res === '4k' || res === '2160p') return '4k';
  if (res === '1080p') return 1080;
  if (res === '720p') return 720;
  if (res === '480p') return 480;
  if (res === '360p') return 360;
  return 'unknown';
}

function isBrowserCompatibleStream(stream: DebridParsedStream): boolean {
  const codec = stream.codec?.toLowerCase();
  const container = stream.container?.toLowerCase();
  const haystack = `${stream.title} ${stream.url}`.toLowerCase();

  if (container === 'mkv' || haystack.includes('.mkv')) return false;
  if (codec === 'h265' || codec === 'hevc' || codec === 'x265') return false;
  if (!codec && (haystack.includes('hevc') || haystack.includes('x265') || haystack.includes('h265'))) {
    return false;
  }

  return true;
}

// Helper to score streams for browser compatibility (higher is better)
function scoreStream(stream: DebridParsedStream): number {
  let score = 0;
  const codec = stream.codec?.toLowerCase();
  if (stream.container === 'mp4') score += 10;
  if (stream.audio === 'aac') score += 5;
  if (codec === 'h264' || codec === 'avc') score += 10;
  if (codec === 'h265' || codec === 'hevc') score -= 8;
  if (stream.container === 'mkv') score -= 6;
  if (stream.complete) score += 1;
  return score;
}

function pickBestStream(streams: DebridParsedStream[]): DebridParsedStream | undefined {
  return [...streams].sort((a, b) => scoreStream(b) - scoreStream(a))[0];
}

const COMET_TIMEOUT_MS = 2500;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function comboScraper(ctx: ShowScrapeContext | MovieScrapeContext): Promise<SourcererOutput> {
  const apiKey = getDebridToken();
  if (!apiKey) {
    throw new NotFoundError('Debrid API token is required');
  }

  const debridProvider: debridProviders = getDebridService();

  const torrentioResult = await getAddonStreams(
    `https://torrentio.strem.fun/${debridProvider}=${apiKey}`,
    ctx,
  );

  ctx.progress(33);

  const torrentioStreams = await parseStreamData(
    torrentioResult.streams.map((s) => ({
      ...s,
      title: s.title ?? s.behaviorHints?.filename ?? s.name ?? '',
    })),
    ctx,
  );

  let cometStreams: DebridParsedStream[] = [];
  if (torrentioStreams.length < 5) {
    cometStreams = await withTimeout(
      getCometStreams(apiKey, debridProvider, ctx).catch(() => [] as DebridParsedStream[]),
      COMET_TIMEOUT_MS,
      [] as DebridParsedStream[],
    );
  }

  const allStreams = [...torrentioStreams, ...cometStreams].filter(
    (stream) => normalizeQuality(stream.resolution) !== '4k' && isBrowserCompatibleStream(stream),
  );

  if (allStreams.length === 0) {
    console.log('No streams found from either source!');
    throw new NotFoundError('No streams found or parse failed!');
  }

  console.log(
    `Total streams: ${allStreams.length} (${torrentioStreams.length} from Torrentio, ${cometStreams.length} from Comet)`,
  );

  ctx.progress(66);

  const qualities: Partial<Record<'4k' | 1080 | 720 | 480 | 360 | 'unknown', { type: 'mp4'; url: string }>> = {};

  const byQuality: Record<string, DebridParsedStream[]> = {};
  for (const stream of allStreams) {
    const quality = normalizeQuality(stream.resolution);
    if (!byQuality[quality]) byQuality[quality] = [];
    byQuality[quality].push(stream);
  }

  for (const [quality, streams] of Object.entries(byQuality)) {
    if (quality === '4k') continue;
    const best = pickBestStream(streams);
    if (best) {
      qualities[quality as keyof typeof qualities] = {
        type: 'mp4',
        url: best.url,
      };
    }
  }

  if (Object.keys(qualities).length === 0) {
    throw new NotFoundError('No browser-compatible streams found');
  }

  ctx.progress(100);

  return {
    embeds: [],
    stream: [
      {
        id: 'primary',
        type: 'file',
        qualities,
        captions: [],
        flags: [flags.CORS_ALLOWED],
        skipValidation: true,
      },
    ],
  };
}

export const debridScraper = makeSourcerer({
  id: 'debrid',
  name: 'Debrid',
  rank: 450,
  disabled: !getDebridToken(),
  flags: [flags.CORS_ALLOWED],
  scrapeMovie: comboScraper,
  scrapeShow: comboScraper,
});
