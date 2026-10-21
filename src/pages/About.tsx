/** /about */
export function About() {
  return (
    <>
      <div className="intro">
        <p className="eyebrow">About</p>
        <h1>About Fair Share</h1>
        <p className="dek">
          Fair Share is a Calculate America tool. Calculate America builds interactive tools that help people explore
          economic ideas and test policy scenarios with real data.
        </p>
      </div>
      <div className="stack">
        <section className="card">
          <h2 className="card-title">What it does</h2>
          <p className="sub">
            Fair Share shows how the US divides its income and wealth, and what your income would be if the same total
            were divided differently: like another year, another country, a custom split, or a different tax system. It
            keeps the size of the economy fixed and changes only how it is divided, and says so on every result.
          </p>
        </section>
        <section className="card">
          <h2 className="card-title">Credits</h2>
          <p className="sub">Built by Adam Lake. Methods advisor: James Green-Armytage.</p>
          <p className="sub">
            Data from the World Inequality Database and the distributional national accounts of Thomas Piketty, Emmanuel
            Saez and Gabriel Zucman; alternative estimates by Gerald Auten and David Splinter; the Federal Reserve's
            Distributional Financial Accounts; the Bureau of Economic Analysis; the Bureau of Labor Statistics; the IRS
            Statistics of Income; the Tax Foundation; and IPUMS CPS. See Sources for details.
          </p>
        </section>
        <section className="card">
          <h2 className="card-title">Privacy</h2>
          <p className="sub">
            Everything runs in your browser. The amounts you enter are never sent anywhere, stored, or put in a link. The
            site uses no analytics and no cookies. Your light or dark mode choice is remembered in this browser only.
          </p>
        </section>
        <section className="card">
          <h2 className="card-title">License and code</h2>
          <p className="sub">
            The code is open source under the GPL-3.0 license, at{' '}
            <a href="https://github.com/creatinglake/Calculate_America">github.com/creatinglake/Calculate_America</a>. To
            report a problem or suggest a change, open an issue there.
          </p>
        </section>
      </div>
    </>
  );
}
