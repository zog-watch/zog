import { ProxyAgent, setGlobalDispatcher } from 'undici';

/**
 * Route all outbound proxy fetches through a residential/datacenter upstream
 * HTTP proxy so scraper requests use a non-blocked IP.
 *
 * Set UPSTREAM_PROXY=http://user:pass@host:port on the service.
 */
export default defineNitroPlugin(() => {
  const raw = process.env.UPSTREAM_PROXY?.trim();
  if (!raw) return;

  let uri = raw;
  try {
    uri = new URL(raw).toString();
  } catch {
    console.error('[upstream-proxy] Invalid UPSTREAM_PROXY URL');
    return;
  }

  setGlobalDispatcher(new ProxyAgent(uri));
  const safe = new URL(uri);
  console.log(
    `[upstream-proxy] Outbound fetches via ${safe.protocol}//${safe.hostname}:${safe.port}`,
  );
});
