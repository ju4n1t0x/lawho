// @ts-check
import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://<tu-usuario>.github.io',
  base: '/<nombre-repositorio>/',
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
    },
    validateSecrets: false,
  },
});
