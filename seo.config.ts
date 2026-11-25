/**
 * All SEO text lives here. scripts/seoPlugin.ts reads this file and injects the meta tags into index.html at build time,
 * so wording only ever needs to be edited in one place.
 */
export const seo = {
  siteName: 'Avito code runtime',
  // Keep the title under ~60 characters and the description under ~160 so Google does not truncate them.
  title: 'Avito code runtime – Collaborative online code editor',
  description:
    'Write and run JavaScript, Python, C/C++, Rust and Java together in real time. Peer-to-peer rooms, no sign-up, and your code runs right in the browser.',
  locale: 'en_US',
  language: 'en',

  // Image shown when the link is shared (Facebook, Zalo, Telegram, Slack, X...). Standard ratio is 1200x630.
  // Design source: scripts/og-image/og.html. The path is relative to the site root.
  ogImage: {
    path: 'assets/og-image.png',
    width: 1200,
    height: 630,
    alt: 'Avito code runtime: two people editing the same Python file in real time, with the program output below the editor',
  },

  // Feature list for the structured data (JSON-LD).
  features: [
    'Real-time collaborative code editing',
    'Run JavaScript, Python, C/C++, Rust and Java in the browser',
    'Peer-to-peer rooms with shareable links and QR codes',
    'No installation and no account',
    'Light and dark editor themes',
  ],

  /**
   * Full address of the site, with a trailing slash. Used for the canonical link, og:url, og:image, sitemap.xml and robots.txt.
   * If you leave it empty, the address is derived from GITHUB_REPOSITORY and --base when building in GitHub Actions.
   * Change it if the site moves to a custom domain (or set the VITE_SITE_URL variable, which takes priority).
   */
  siteUrl: 'https://scorpionov2.github.io/avito-code-runtime/',

  /**
   * Google Search Console ownership token ("HTML tag" method): only the content value, e.g. 'AbC123...'.
   * Leave it empty if you verify with an HTML file or a DNS record. Can also be set with VITE_GSC_VERIFICATION.
   */
  googleVerification: 'aSLyMDtqkP_tbL5yp8lEfCZHYgVgcVAh4qhAbXSSCi8',
};
