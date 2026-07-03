declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, unknown>; u?: string },
    ) => void;
  }
}

export const PLAUSIBLE_SCRIPT_SRC =
  "https://plausible-production-70a1.up.railway.app/js/script.file-downloads.hash.outbound-links.pageview-props.revenue.tagged-events.js";

export const PLAUSIBLE_DOMAIN = "zog.watch";

export function trackPlausiblePageview(path?: string) {
  if (typeof window.plausible !== "function") return;
  window.plausible("pageview", path ? { u: path } : undefined);
}
