import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';

// Pages listed in the sitemap, relative to SITE_URL.
const PAGES = [
  { path: '', priority: '1.0' },
  { path: 'privacy-policy.html', priority: '0.3' },
];

// Fills %SITE_URL% in the HTML and writes robots.txt and sitemap.xml at build time.
function seo(siteUrl) {
  const lastmod = new Date().toISOString().slice(0, 10);
  return {
    name: 'tt-seo',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl),
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap.xml\n`,
      });
      const urls = PAGES.map(
        (p) => `  <url>\n    <loc>${siteUrl}${p.path}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${p.priority}</priority>\n  </url>`,
      ).join('\n');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  let siteUrl = loadEnv(mode, import.meta.dirname, '').SITE_URL || 'https://example.com/';
  if (!siteUrl.endsWith('/')) siteUrl += '/';

  return {
    // Relative asset paths so the build works on GitHub Pages sub-paths too.
    base: './',
    plugins: [seo(siteUrl)],
    build: {
      rollupOptions: {
        input: {
          main: resolve(import.meta.dirname, 'index.html'),
          privacy: resolve(import.meta.dirname, 'privacy-policy.html'),
        },
      },
    },
  };
});
