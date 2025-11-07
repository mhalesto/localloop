const LostHeader = () => (
  <header>
    <nav className="nav">
      <a className="nav-logo" href="./">
        <img src="./logo.svg" alt="LocalLoop logo" width="32" height="32" />
        <span>LocalLoop</span>
      </a>
      <div className="nav-actions">
        <a href="./#features">Features</a>
        <a href="./#pricing">Pricing</a>
        <a href="./contact.html">Contact</a>
        <a className="button secondary" href="./policy.html">
          Policies
        </a>
      </div>
    </nav>
  </header>
);

const LostHero = () => (
  <section className="hero">
    <div className="hero-content">
      <div className="hero-headline">
        <span className="pill">404 · Page missing</span>
        <h1>Looks like this Loop drifted off the map.</h1>
        <p>
          The page you’re looking for might have been renamed, removed, or never existed. Let’s guide you back to the
          parts of LocalLoop that are buzzing.
        </p>
      </div>
      <div className="hero-meta">
        <div className="hero-cta">
          <a className="button primary" href="./">
            Go to homepage
          </a>
          <a className="button secondary" href="./contact.html">
            Contact support
          </a>
        </div>
        <div className="stats">
          <div className="stat">
            <span className="stat-value">24/7</span>
            <span className="stat-label">Community uptime</span>
          </div>
          <div className="stat">
            <span className="stat-value">12h</span>
            <span className="stat-label">Premium support</span>
          </div>
          <div className="stat">
            <span className="stat-value">2h</span>
            <span className="stat-label">Gold concierge</span>
          </div>
        </div>
      </div>
    </div>
    <div className="hero-media">
      <div className="lottie-wrapper">
        <lottie-player
          src="./error-404.json"
          background="transparent"
          speed="1"
          loop
          autoplay
        ></lottie-player>
      </div>
      <div className="hero-frame">
        <div className="chip-row">
          <span className="chip">Safe neighborhoods</span>
          <span className="chip">Local commerce</span>
          <span className="chip">Community action</span>
        </div>
        <p className="hero-note">
          Lost? Reach out at <a href="mailto:hello@localloop.app">hello@localloop.app</a> and we’ll help you find what you need.
        </p>
      </div>
    </div>
  </section>
);

const HelpfulLinks = () => (
  <section>
    <div className="section-header">
      <span className="pill">Quick links</span>
      <h2>Where would you like to go next?</h2>
      <p>Jump back into the most popular destinations around LocalLoop.</p>
    </div>
    <div className="pricing-grid">
      <article className="feature-card">
        <h3>Product tour</h3>
        <p>See how LocalLoop powers alerts, commerce, and events.</p>
        <a className="button primary" href="./#features">
          Explore features
        </a>
      </article>
      <article className="feature-card">
        <h3>Pricing</h3>
        <p>Compare Basic, Premium, and Gold just like in the app.</p>
        <a className="button primary" href="./#pricing">
          View plans
        </a>
      </article>
      <article className="feature-card">
        <h3>Talk with us</h3>
        <p>Need a custom rollout or civic deployment? Let’s chat.</p>
        <a className="button primary" href="./contact.html">
          Contact team
        </a>
      </article>
    </div>
  </section>
);

const LostFooter = () => (
  <footer>
    <p>© {new Date().getFullYear()} LocalLoop. Turning neighborhoods into connected, resilient loops.</p>
    <div className="nav-actions">
      <a href="./policy.html">Policies</a>
      <a href="mailto:hello@localloop.app">hello@localloop.app</a>
      <a href="https://github.com/mhalesto" target="_blank" rel="noreferrer">
        GitHub
      </a>
    </div>
  </footer>
);

const LostPage = () => (
  <React.Fragment>
    <LostHeader />
    <main>
      <LostHero />
      <HelpfulLinks />
    </main>
    <LostFooter />
  </React.Fragment>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<LostPage />);
