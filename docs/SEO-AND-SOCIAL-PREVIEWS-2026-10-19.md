# SEO and social previews

BelivrHQ now shares the landing page's teal, cream and lime identity across 22 PNG social banners: the homepage (`/og.png`), Help Centre (`/og/help.png`) and each of the 20 published guides (`/og/help/<slug>.png`). Every image is 1200 × 630, uses the official logo/emblem, and is served as a static public file. Guide images use the actual article title and topic. Open Graph and Twitter use the same matching image and text. No external image generation service, runtime rendering dependency, or invented testimonials/usage metrics are involved.

Run `npm run og:generate` after changing a guide title/topic or the banner design. The generator uses the existing TypeScript help catalog, Sharp, system DejaVu fonts and official brand PNGs. Generated images are checked in; deployment does not require a font download or image-generation call. The unit checks verify that every published guide has an actual PNG of the expected dimensions.

## Metadata and discovery

`src/lib/seo.ts` builds complete public metadata, including absolute canonical and Open Graph URLs, locale, large social images, matching Twitter text and explicit indexability. This avoids Next.js nested metadata replacement losing inherited social fields. The root layout defaults to noindex/nofollow, with public marketing and published guides explicitly opting in. Account screens, dashboards, subscription/payment pages and token form links remain noindex. They do not inherit a homepage canonical or public social URL. This controls search visibility; existing authentication and authorization still control access.

The homepage includes Organization, WebSite and SoftwareApplication JSON-LD. Help Centre has CollectionPage/ItemList data. Individual guides have TechArticle and BreadcrumbList data. JSON-LD escapes HTML delimiters. No unsupported reviews, ratings, publication dates, social accounts or church-specific identity are invented. Article modification dates use the catalog's explicit review date. The sitemap includes only the homepage, Help Centre and published guides, and no longer claims that the homepage was edited on every build. Robots excludes API and workspace/account routes while keeping public content and images crawlable.

Vercel preview deployments have noindex metadata, a disallow-all robots file and an empty sitemap. Public structured data/canonical URLs continue to refer to the production domain. Local development can use its own configured origin.

## Deployment configuration

Set `NEXT_PUBLIC_SITE_URL` to the public **production origin**, for example `https://church-os-web.vercel.app`, and rebuild. Use a custom domain here when one is ready. This setting wins over Vercel's production-domain variable; when absent, `VERCEL_PROJECT_PRODUCTION_URL` is used, followed by the existing documented BelivrHQ Vercel origin. The local `.env.local` currently deliberately specifies localhost and was not edited. The acceptance build overrides that value with the existing production origin. Avoid using a temporary preview origin in this setting.

Optional `GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION` values render ownership meta tags when configured. Obtain the real tokens from the respective webmaster account; no placeholder verification tag is emitted. After deployment, verify domain ownership and submit `/sitemap.xml` in Google Search Console/Bing Webmaster Tools. Those account actions are not performed by this change. Social platforms may retain older shared previews until their caches refresh; use their sharing debugger/inspector to request a refresh after deployment.

The existing PWA manifest/icon paths remain available. Its description, paper background and teal theme now match the current product branding. Root theme-color matches the teal palette.

## References

- [Next.js 15 metadata API](https://nextjs.org/docs/15/app/api-reference/functions/generate-metadata)
- [Next.js robots convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)
- [Next.js sitemap convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)

Installed `node_modules/next/dist/docs` is absent in this checkout; the official version-15 metadata guide was consulted instead.

## Validation

Production build, TypeScript and scoped ESLint passed. All 348 unit tests across 18 suites pass. All 42 selected browser checks pass: 10 SEO checks, 18 Help Centre checks, seven public-form checks and seven account navigation/recovery/MFA checks. SEO checks inspect initial HTML with JavaScript disabled, verify canonicals and OG/Twitter fields, enforce noindex boundaries, fetch all 22 social images, and inspect robots/sitemap. Homepage and guide banner PNGs were visually reviewed. Browser API/provider calls are mocked; no live form, account, subscription, email or chat mutation was made. Changes have not been deployed.
