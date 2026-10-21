import { ROUTES, matchRoute } from './routes';
import { Link, useLocation, useScrollTopOnNavigate } from './app/router';
import { useTheme } from './app/theme';
import { Explore } from './pages/Explore';

// Shell with placeholder pages. Real pages arrive in Phase 4 onward, styled
// after the design direction Adam picks.
export function App() {
  const { path } = useLocation();
  useScrollTopOnNavigate(path);
  const [theme, toggleTheme] = useTheme();
  const route = ROUTES.find((r) => r.path === matchRoute(path));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-wide text-neutral-500">Calculate America</p>
        <div className="flex items-center justify-between gap-4">
          <p className="text-3xl font-semibold">Fair Share</p>
          <button type="button" onClick={toggleTheme} className="rounded border px-3 py-1 text-sm">
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
        <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {ROUTES.map((r) => (
            <Link key={r.path} href={r.path} className="underline" aria-current={r === route ? 'page' : undefined}>
              {r.title}
            </Link>
          ))}
        </nav>
      </header>
      <main>
        <h1 className="mb-4 text-2xl font-semibold">{route ? route.title : 'Page not found'}</h1>
        {route?.path === '/explore/' ? (
          <Explore />
        ) : (
          <p className="mt-2 text-[var(--text-muted)]">
            {route ? 'Under construction.' : 'There is no page at this address.'}
          </p>
        )}
      </main>
    </div>
  );
}
