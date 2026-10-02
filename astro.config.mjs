// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

const isNetlify = Boolean(process.env.NETLIFY || process.env.NETLIFY_LOCAL);

// https://astro.build/config
export default defineConfig({
  site: 'https://mumutech.netlify.app',
  output: 'server',
  adapter: isNetlify ? netlify() : node({ mode: 'standalone' }),
  integrations: [sitemap()],
  scopedStyleStrategy: 'where',
});
