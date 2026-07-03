export default defineEventHandler(() => {
  const cfg = useRuntimeConfig();
  return {
    ok: true,
    service: "zog-cache",
    version: cfg.version,
  };
});
