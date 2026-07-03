import { runCleanup } from "@/utils/cache";

export default defineNitroPlugin(() => {
  const cfg = useRuntimeConfig().cache;
  const interval = cfg.cleanupIntervalMs;
  console.log(`[zog-cache] cleanup interval: ${interval}ms`);

  const tick = async () => {
    try {
      const result = await runCleanup();
      if (result.evicted || result.expired) {
        console.log(
          `[zog-cache] cleanup: expired=${result.expired} evicted=${result.evicted} ` +
            `totalBefore=${result.totalBefore} totalAfter=${result.totalAfter}`,
        );
      }
    } catch (err) {
      console.error("[zog-cache] cleanup error:", err);
    }
  };

  // first run after a short delay (let things settle)
  setTimeout(tick, 30_000);
  setInterval(tick, interval);
});
