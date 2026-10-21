# Calculate America: Fair Share

Calculate America is a platform of interactive tools that help people explore economic ideas, test policy scenarios, and imagine what a stronger, more functional system could look like.

**Fair Share** shows how the US economy divides its income and wealth, and what a person's income would be if the same total were divided differently. It will live at https://fairshare.calculateamerica.com. The build spec is [FAIRSHARE_PLAN.md](FAIRSHARE_PLAN.md).

## The site

| Path | Page |
|---|---|
| `/` | Story: a short explainer |
| `/explore/` | Calculator: your income under another year, country, custom split |
| `/top/` | The top, up close: zoom grid, parade |
| `/taxes/` | Tax scenarios |
| `/wealth/` | Wealth mode |
| `/methods/` | Methods, written from the engine code |
| `/sources/` | Sources, rendered from `public/data/manifest.json` |
| `/about/`, `/ethics/` | About; the essay (draft placeholder) |

Code layout: `src/engine/` (pure calculation engine, fully tested), `src/model/` (data to engine inputs), `src/pages/`, `src/components/`, `src/charts/`; `pipeline/` (Python data pipeline and `VERIFICATION.md`); `docs/` (feedback log, questions for James).

The previous AI Studio prototype is in `legacy/` for reference and will be removed once the rebuild reaches parity.

## Develop

Requires Node 24. No API keys or environment variables.

```
npm install
npm run dev          # local dev server
npm test             # unit tests (Vitest)
npm run typecheck
npm run build        # static site in dist/
npm run preview      # serve the production build
npm run test:e2e     # Playwright smoke tests against the build
```

## Deploy

Static site on GitHub Pages, deployed by `.github/workflows/deploy.yml`. The build writes a copy of `index.html` at every route path (see `scripts/route-pages.ts`) because Pages has no single-page-app fallback.

## License

GPL-3.0. See [LICENSE](LICENSE).
