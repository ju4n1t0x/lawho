// @ts-check
import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // Producción: servir desde la raíz sin prefijo de ruta.
  // (El preview de GitHub Pages usaba site/base específicos; ya no aplican.)
  adapter: vercel({
    excludeFiles: [
      '**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/fixtures/**',
      '**/coverage/**', '**/node_modules/vitest/**', '**/node_modules/@vitest/**',
      '**/node_modules/typescript/**', '**/node_modules/@types/**',
    ],
  }),
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
      AWS_ENDPOINT_URL_S3: envField.string({ context: 'server', access: 'secret', optional: true }),
      AWS_REGION: envField.string({ context: 'server', access: 'secret', optional: true }),
      AWS_ACCESS_KEY_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      AWS_SECRET_ACCESS_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      STORAGE_BUCKET: envField.string({ context: 'server', access: 'secret', optional: true }),
      MAX_UPLOAD_SIZE_BYTES: envField.number({ context: 'server', access: 'secret', default: 5242880 }),
      SESSION_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
    validateSecrets: false,
  },
});
