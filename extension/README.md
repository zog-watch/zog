# Zog Extension

Browser extension for [Zog](https://zog.watch). Provides the same CORS-bypass and
stream-preparation capabilities as the original extension, rebranded for
Zog.

## Build

```bash
pnpm install
pnpm build          # Chrome / Edge
pnpm build:firefox  # Firefox
```

## Load unpacked

1. Run `pnpm build`.
2. Open Chrome → Extensions → Developer mode → Load unpacked.
3. Select `extension/build/chrome-mv3-prod`.

## License

MIT
