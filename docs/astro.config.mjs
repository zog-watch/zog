// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import starlight from '@astrojs/starlight';
import Icons from 'unplugin-icons/vite';

// Allow site URL and base path to be overridden via environment variables
const site = process.env.SITE_URL ?? 'https://zog.watch';
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site,
  base: base === '/' ? undefined : base,
  integrations: [
    starlight({
      title: 'Zog',
      description: 'Zog is a free and open source streaming site, no ads, no tracking, no nonsense.',
      logo: {
        light: './src/assets/icon-light.png',
        dark: './src/assets/icon-dark.png',
      },
      favicon: '/favicon.ico',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/zog-watch/zog' },
         { icon: 'discord', label: 'Discord', href: `${base === '/' ? '' : base}/links/discord` },
      ],
      sidebar: [
        {
          label: 'Global',
          items: [
            { label: 'Instances', slug: 'instances' },
            { label: 'Browser Extension', slug: 'extension' },
            { label: 'Support', slug: 'support' },
          ],
        },
        {
          label: 'Self-Hosting',
          items: [
            { label: 'Start self-hosting', slug: 'self-hosting/hosting-intro' },
            { label: 'Configure backend', slug: 'self-hosting/use-backend' },
            { label: 'PWA vs no-PWA', slug: 'self-hosting/about-pwa' },
            { label: 'Troubleshooting', slug: 'self-hosting/troubleshooting' },
          ],
        },
        {
          label: 'Proxy',
          items: [
            { label: 'Introduction', slug: 'proxy/introduction' },
            { label: 'Deploy', slug: 'proxy/deploy' },
            { label: 'Configuration', slug: 'proxy/configuration' },
          ],
        },
        {
          label: 'Client',
          items: [
            { label: 'Introduction', slug: 'client/introduction' },
            { label: 'Deploy', slug: 'client/deploy' },
            { label: 'TMDB API Key', slug: 'client/tmdb' },
            { label: 'Configuration', slug: 'client/configuration' },
            { label: 'Update guide', slug: 'client/upgrade' },
          ],
        },
        {
          label: 'Backend',
          items: [
            { label: 'Introduction', slug: 'backend/introduction' },
            { label: 'Deploy', slug: 'backend/deploy' },
            { label: 'Configuration', slug: 'backend/configuration' },
            { label: 'Update guide', slug: 'backend/upgrade' },
          ],
        },
        {
          label: 'Extra',
          items: [
            { label: 'Streaming', slug: 'extra/streaming' },
            { label: 'Selfhost', slug: 'extra/selfhost' },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
      components: {
        Head: './src/components/Head.astro',
      },
      editLink: {
        baseUrl: 'https://github.com/zog-watch/docs/edit/master/',
      },
    }),
  ],
  vite: {
    plugins: [
      Icons({
        compiler: 'astro',
      }),
    ],
  },
  experimental: {
    fonts: [
      {
        provider: fontProviders.google(),
        name: 'Inter',
        cssVariable: '--font-inter',
      },
    ],
  },
});
