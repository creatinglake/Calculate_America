import { ROUTES, matchRoute } from './routes';

// Phase 0 shell: one placeholder per route. Real pages arrive in later phases.
export function App() {
  const path = matchRoute(window.location.pathname);
  const route = ROUTES.find((r) => r.path === path);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-wide text-neutral-500">Calculate America</p>
        <h1 className="text-3xl font-semibold">Fair Share</h1>
        <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {ROUTES.map((r) => (
            <a key={r.path} href={r.path} className="underline">
              {r.title}
            </a>
          ))}
        </nav>
      </header>
      <main>
        <h2 className="text-xl font-semibold">{route ? route.title : 'Page not found'}</h2>
        <p className="mt-2 text-neutral-600">
          {route ? 'Under construction.' : 'There is no page at this address.'}
        </p>
      </main>
    </div>
  );
}
