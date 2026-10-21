// Every page on the site. The build writes a copy of index.html at each path
// so GitHub Pages serves deep links directly (see scripts/route-pages.ts).
export const ROUTES = [
  { path: '/', title: 'Story' },
  { path: '/explore/', title: 'Calculator' },
  { path: '/top/', title: 'The top, up close' },
  { path: '/taxes/', title: 'Tax scenarios' },
  { path: '/wealth/', title: 'Wealth' },
  { path: '/methods/', title: 'Methods' },
  { path: '/ethics/', title: 'The case' },
  { path: '/sources/', title: 'Sources' },
  { path: '/about/', title: 'About' },
] as const;

export type RoutePath = (typeof ROUTES)[number]['path'];

/** Normalise a location pathname to a known route, or null for a 404. */
export function matchRoute(pathname: string): RoutePath | null {
  const withSlash = pathname.endsWith('/') ? pathname : `${pathname}/`;
  const found = ROUTES.find((r) => r.path === withSlash);
  return found ? found.path : null;
}
