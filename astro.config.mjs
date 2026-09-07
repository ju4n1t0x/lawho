// @ts-check
import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://ju4n1t0x.github.io',
  base: '/lawho/',
  adapter: node({ mode: 'standalone' }),
  vite: {
    plugins: [tailwindcss()],
  },
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  env: {
    schema: {
      DATABASE_HOST: envField.string({ context: 'server', access: 'secret' }),
      DATABASE_PORT: envField.number({ context: 'server', access: 'secret' }),
      DATABASE_USER: envField.string({ context: 'server', access: 'secret' }),
      DATABASE_PASSWORD: envField.string({ context: 'server', access: 'secret' }),
      DATABASE_NAME: envField.string({ context: 'server', access: 'secret' }),
      DATABASE_SSL: envField.boolean({ context: 'server', access: 'public', default: false }),
      SESSION_TTL_MS: envField.number({ context: 'server', access: 'secret', default: 86400000 }),
      UPLOADS_DIR: envField.string({ context: 'server', access: 'secret', default: './uploads' }),
      PUBLIC_UPLOADS_URL: envField.string({ context: 'server', access: 'public', default: '/uploads' }),
      SESSION_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
    validateSecrets: false,
  },
});
