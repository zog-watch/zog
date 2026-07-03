import { runCleanup } from "@/utils/cache";
import { recoverIndexFromS3 } from "@/utils/s3recover";

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

  // first run: recover index from S3, then clean up
  setTimeout(async () => {
    try {
      const recovered = await recoverIndexFromS3();
      if (recovered > 0) {
        console.log(`[zog-cache] recovered ${recovered} entries from S3`);
      }
    } catch (err) {
      console.error("[zog-cache] S3 recovery error:", err);
    }
    tick();
  }, 30_000);
  setInterval(tick, interval);
});
