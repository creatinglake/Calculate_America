import { ROUTES, matchRoute, type RoutePath } from './routes';
import type { JSX } from 'react';
import { Link, useLocation, useScrollTopOnNavigate } from './app/router';
import { useTheme } from './app/theme';
import { Explore } from './pages/Explore';
import { Top } from './pages/Top';
import { Taxes } from './pages/Taxes';
import { Wealth } from './pages/Wealth';
import { Sources } from './pages/Sources';
import { About } from './pages/About';
import { Ethics } from './pages/Ethics';
import { Story } from './pages/Story';
import { Methods } from './pages/Methods';

// The logo links to the story at /.
const NAV = ['/explore/', '/top/', '/taxes/', '/wealth/', '/methods/', '/sources/', '/about/'] as const;
const NAV_LABEL: Record<string, string> = { '/explore/': 'Calculator', '/top/': 'The top' };

const PAGES: Record<RoutePath, () => JSX.Element> = {
  '/': Story, '/explore/': Explore, '/top/': Top, '/taxes/': Taxes, '/wealth/': Wealth,
  '/methods/': Methods, '/ethics/': Ethics, '/sources/': Sources, '/about/': About,
};

export function App() {
  const { path } = useLocation();
  useScrollTopOnNavigate(path);
  const [theme, toggleTheme] = useTheme();
  const route = ROUTES.find((r) => r.path === matchRoute(path));
  const Page = route ? PAGES[route.path] : null;

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
                    <Link href={p} aria-current={r === route ? 'page' : undefined}>{NAV_LABEL[p] ?? r.title}</Link>
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
        {Page ? (
          <Page />
        ) : (
          <div className="intro">
            <h1>Page not found</h1>
            <p className="dek">There is no page at this address. <Link href="/">Go to the start</Link>.</p>
          </div>
        )}
      </main>
      <footer className="site-foot">
        <p>
          Fair Share is a Calculate America tool. Data: World Inequality Database (Piketty, Saez and Zucman); Auten and
          Splinter; Federal Reserve; BEA; BLS; IRS. See <Link href="/sources/">Sources</Link>,{' '}
          <Link href="/methods/">Methods</Link> and <Link href="/ethics/">The case</Link>.
        </p>
      </footer>
    </>
  );
}
