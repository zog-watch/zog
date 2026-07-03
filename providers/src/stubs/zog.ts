/**
 * Stubs for proprietary Zog web-app helpers that are not part of the public
 * provider scrapers. They allow the frontend to build and run; the affected
 * UI features simply show empty / unavailable states when no backend data is
 * present.
 */

export interface GridData {
  downloads: Array<{
    title: string;
    format?: string;
    resolution?: string;
    size?: string;
    sources: Array<{ name: string; url: string }>;
  }>;
}

export async function fetchGridData(_tmdbId: string): Promise<GridData> {
  return { downloads: [] };
}

export interface FileVariant {
  fid: string;
  name: string;
  quality?: string;
  codec?: string;
  tag?: string;
  size?: string;
}

export interface ArtemisFileVariant extends FileVariant {}

export interface VariantMeta {
  variants?: FileVariant[];
  shareKey?: string;
}

export interface ArtemisVariantMeta {
  variants?: ArtemisFileVariant[];
}

export function getVariantMeta(): VariantMeta | null {
  return null;
}

export function getArtemisVariantMeta(): ArtemisVariantMeta | null {
  return null;
}

export interface ResolvedVariant {
  url?: string;
}

export interface ResolvedAuroraVariant {
  streams: Record<string, { url: string; type: 'hls' | 'mp4' }>;
  subtitles?: Record<string, { subtitle_link: string }>;
}

export function resolveArtemisVariant(_fid: string): ResolvedVariant | null {
  return null;
}

export async function resolveVariant(
  _fid: string,
  _shareKey: string,
  _token: string,
): Promise<ResolvedAuroraVariant | null> {
  return null;
}
