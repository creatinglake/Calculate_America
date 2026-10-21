import { ROUTES, matchRoute } from './routes';
import { Link, useLocation, useScrollTopOnNavigate } from './app/router';
import { useTheme } from './app/theme';
import { Explore } from './pages/Explore';
import { Top } from './pages/Top';
import { Taxes } from './pages/Taxes';

const NAV = ['/', '/explore/', '/top/', '/taxes/', '/methods/', '/sources/', '/about/'] as const;

// Pages other than the calculator are placeholders until their phases.
export function App() {
  const { path } = useLocation();
  useScrollTopOnNavigate(path);
  const [theme, toggleTheme] = useTheme();
  const route = ROUTES.find((r) => r.path === matchRoute(path));

  return (
    <>
      <header className="site">
        <div className="site-inner">
          <Link href="/" className="brand">
            <span className="mark" aria-hidden>
              <svg viewBox="0 0 20 20"><rect x="2" y="11" width="4" height="7" rx="1" /><rect x="8" y="7" width="4" height="11" rx="1" /><rect x="14" y="2" width="4" height="16" rx="1" /></svg>
            </span>
            <span className="brand-text">
              <span className="brand-tool">Fair Share</span>
              <span className="brand-org">Calculate America</span>
            </span>
          </Link>
          <nav aria-label="Main">
            <ul>
              {NAV.map((p) => {
                const r = ROUTES.find((x) => x.path === p)!;
                return (
                  <li key={p}>
                    <Link href={p} aria-current={r === route ? 'page' : undefined}>{p === '/explore/' ? 'Calculator' : r.title}</Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </header>
      <main className="page">
        {route?.path === '/explore/' ? (
          <Explore />
        ) : route?.path === '/top/' ? (
          <Top />
        ) : route?.path === '/taxes/' ? (
          <Taxes />
        ) : (
          <div className="intro">
            <h1>{route ? route.title : 'Page not found'}</h1>
            <p className="dek">{route ? 'This page is coming soon.' : 'There is no page at this address.'}</p>
          </div>
        )}
      </main>
      <footer className="site-foot">
        <p>Fair Share is a Calculate America tool. Data: World Inequality Database, Piketty, Saez and Zucman; Auten and Splinter; BEA; BLS; IRS. See Sources.</p>
      </footer>
    </>
  );
}
