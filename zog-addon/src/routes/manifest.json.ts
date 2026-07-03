export default defineEventHandler(() => {
  const base = useRuntimeConfig().publicBase;
  return {
    id: "community.zognet",
    version: "0.1.0",
    name: "Zog Net",
    description: "Self-hosted TorBox streams (no elfhosted)",
    types: ["movie", "series"],
    resources: ["stream"],
    idPrefixes: ["tt"],
    catalogs: [],
    behaviorHints: {
      configurable: false,
      configurationRequired: false,
    },
    contactEmail: "admin@zog.watch",
    endpoints: [base ? `${base}/manifest.json` : "manifest.json"],
  };
});
