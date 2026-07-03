import { join } from "path";
import pkg from "./package.json";

export default defineNitroConfig({
  compatibilityDate: "2025-04-20",
  srcDir: "./src",
  runtimeConfig: {
    version: pkg.version,
    debirdToken: process.env.DEBRID_TOKEN ?? "",
    publicBase: process.env.ADDON_PUBLIC_URL ?? "",
    torrentioUrl: process.env.TORRENTIO_URL ?? "https://torrentio.strem.fun",
  },
  alias: {
    "@": join(__dirname, "src"),
  },
});
