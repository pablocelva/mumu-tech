import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const sitemapUrl = site ? new URL('sitemap-index.xml', site).href : 'https://mumutech.netlify.app/sitemap-index.xml';
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${sitemapUrl}
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
