# Zog Desktop

Desktop app for [Zog](https://zog.watch). Wraps the Zog web app in Electron and
provides built-in extension-equivalent CORS handling, Discord Rich Presence, and
auto-updates.

## Development

```bash
pnpm install
pnpm start
```

## Building

```bash
pnpm run build       # Current platform
pnpm run build:mac   # macOS
pnpm run build:win   # Windows
pnpm run build:linux # Linux
```

Built artifacts are output to `dist/`.

## License

MIT
