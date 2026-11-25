import { loadEnv, type HtmlTagDescriptor, type Plugin } from 'vite';
import { seo } from '../seo.config';

type Env = Record<string, string>;

/** Site root address, always ending with "/", or '' when unknown. */
function resolveSiteUrl(env: Env, base: string): string {
  const explicit = (env.VITE_SITE_URL || seo.siteUrl).trim();
  if (explicit) return explicit.endsWith('/') ? explicit : `${explicit}/`;

  // GitHub Actions always sets GITHUB_REPOSITORY = "<owner>/<repo>". The path comes from --base so it matches the real deployment.
  const [owner, repo] = (env.GITHUB_REPOSITORY || '').split('/');
  if (!owner || !repo) return '';
  const host = `${owner.toLowerCase()}.github.io`;
  if (repo.toLowerCase() === host) return `https://${host}/`;
  const basePath = base.startsWith('/') ? base : `/${repo}/`;
  return `https://${host}${basePath.endsWith('/') ? basePath : `${basePath}/`}`;
}

function metaTag(attr: 'name' | 'property', key: string, content: string): HtmlTagDescriptor {
  return { tag: 'meta', attrs: { [attr]: key, content }, injectTo: 'head' };
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function seoPlugin(): Plugin {
  let siteUrl = '';
  let verification = '';

  const absolute = (path: string) => (siteUrl ? new URL(path, siteUrl).href : '');

  return {
    name: 'avito-seo',

    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir, ['VITE_', 'GITHUB_']);
      siteUrl = resolveSiteUrl(env, config.base);
      verification = (env.VITE_GSC_VERIFICATION || seo.googleVerification).trim();

      if (config.command !== 'build') return;
      if (siteUrl) {
        config.logger.info(`[seo] Site address: ${siteUrl}`);
      } else {
        config.logger.warn(
          '\n[seo] The site address is unknown, so canonical, og:url, og:image, sitemap.xml and robots.txt are skipped.\n' +
            '      Set siteUrl in seo.config.ts or the VITE_SITE_URL variable (for example https://code.example.com/).\n',
        );
      }
    },

    transformIndexHtml(html) {
      const ogImageUrl = absolute(seo.ogImage.path);
      const tags: HtmlTagDescriptor[] = [
        metaTag('name', 'description', seo.description),
        metaTag('name', 'robots', 'index, follow, max-image-preview:large'),

        metaTag('property', 'og:type', 'website'),
        metaTag('property', 'og:site_name', seo.siteName),
        metaTag('property', 'og:title', seo.title),
        metaTag('property', 'og:description', seo.description),
        metaTag('property', 'og:locale', seo.locale),

        metaTag('name', 'twitter:card', 'summary_large_image'),
        metaTag('name', 'twitter:title', seo.title),
        metaTag('name', 'twitter:description', seo.description),
      ];

      if (verification) tags.push(metaTag('name', 'google-site-verification', verification));

      if (siteUrl) {
        tags.push(
          { tag: 'link', attrs: { rel: 'canonical', href: siteUrl }, injectTo: 'head' },
          metaTag('property', 'og:url', siteUrl),
          // Facebook, Zalo, Telegram... only accept absolute URLs for images.
          metaTag('property', 'og:image', ogImageUrl),
          metaTag('property', 'og:image:type', 'image/png'),
          metaTag('property', 'og:image:width', String(seo.ogImage.width)),
          metaTag('property', 'og:image:height', String(seo.ogImage.height)),
          metaTag('property', 'og:image:alt', seo.ogImage.alt),
          metaTag('name', 'twitter:image', ogImageUrl),
          metaTag('name', 'twitter:image:alt', seo.ogImage.alt),
        );
      }

      const application = {
        '@type': 'WebApplication',
        name: seo.siteName,
        description: seo.description,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any (modern web browser)',
        inLanguage: seo.language,
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        featureList: seo.features,
        ...(siteUrl && { url: siteUrl, image: ogImageUrl }),
      };
      // WebSite helps Google pick the right site name in search results.
      const graph = siteUrl
        ? [application, { '@type': 'WebSite', name: seo.siteName, url: siteUrl, inLanguage: seo.language }]
        : [application];
      tags.push({
        tag: 'script',
        attrs: { type: 'application/ld+json' },
        // Escape "<" so the JSON string can never close the <script> tag early.
        children: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c'),
        injectTo: 'head',
      });

      return {
        html: html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeXml(seo.title)}</title>`),
        tags,
      };
    },

    generateBundle() {
      if (!siteUrl) return;
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source:
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          `  <url><loc>${escapeXml(siteUrl)}</loc></url>\n` +
          '</urlset>\n',
      });
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${absolute('sitemap.xml')}\n`,
      });
    },
  };
}
