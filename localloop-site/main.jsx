const features = [
  {
    title: 'Real-Time Neighborhood Pulse',
    description: 'Stay informed with instant updates on local alerts, public safety notices, and hyperlocal news the moment it matters.',
    icon: '📡',
    bullets: [
      'Push notifications tuned to your blocks and favorites',
      'Signal-boost urgent alerts for the whole community',
      'Smart filters so noise never drowns out what is essential'
    ]
  },
  {
    title: 'Trust-Forward Marketplace',
    description: 'Discover and recommend the neighbors, pros, and pop-up sellers who keep your neighborhood thriving.',
    icon: '🤝',
    bullets: [
      'Word-of-mouth recommendations you can actually trace',
      'Verified badges for local experts and makers',
      'Secure messaging without exposing personal contact info'
    ]
  },
  {
    title: 'Moments That Spark Togetherness',
    description: 'Plan events, meetup moments, and community projects with collaborative tools designed for real-world connection.',
    icon: '🎉',
    bullets: [
      'Event checklists with RSVPs and volunteer roles',
      'Shared galleries to capture the highlights',
      'Automated reminders so turnout stays high'
    ]
  }
];

const highlights = [
  'Location-aware alerts',
  'Invite-only circles',
  'Neighborhood insights',
  'Community challenges',
  'Built for iOS & Android',
  'Offline-ready caching'
];

const testimonials = [
  {
    quote:
      'LocalLoop tightened the bonds on our block. We use it for everything from lost pets to weekly produce swaps.',
    name: 'Elena Chen',
    role: 'Neighborhood Captain, Greenview East'
  },
  {
    quote:
      'Our small business page gained real customers because neighbors trust the recommendations inside LocalLoop.',
    name: 'Marcus Reed',
    role: 'Owner, Loop Coffee Collective'
  }
];

const Hero = () => (
  <section className="hero">
    <div className="hero-text">
      <span className="pill">Meet LocalLoop</span>
      <h1>Reconnect your block with a single neighborhood app.</h1>
      <p>
        LocalLoop threads together real-time alerts, trusted recommendations, and collaborative events so every neighbor
        feels informed, included, and empowered.
      </p>
      <div className="hero-cta">
        <a className="button primary" href="https://expo.dev" target="_blank" rel="noreferrer">
          Get the beta
        </a>
        <a className="button link" href="#features">
          Explore features
        </a>
      </div>
    </div>
    <div className="hero-card">
      <img src="./mockup.svg" alt="LocalLoop mobile app mockup" />
      <div className="chip-row">
        {highlights.map(label => (
          <span key={label} className="chip">
            {label}
          </span>
        ))}
      </div>
    </div>
  </section>
);

const FeatureCard = ({ feature }) => (
  <article className="feature-card">
    <span className="feature-icon" role="img" aria-hidden="true">
      {feature.icon}
    </span>
    <h3>{feature.title}</h3>
    <p>{feature.description}</p>
    <ul>
      {feature.bullets.map(point => (
        <li key={point}>{point}</li>
      ))}
    </ul>
  </article>
);

const Features = () => (
  <section id="features">
    <h2 className="section-title">Everything local, one tap away</h2>
    <p className="section-subtitle">
      Organize neighborhood life with intuitive tools designed for community stewards, engaged neighbors, and local
      makers alike.
    </p>
    <div className="grid three">
      {features.map(feature => (
        <FeatureCard key={feature.title} feature={feature} />
      ))}
    </div>
  </section>
);

const HowItWorks = () => (
  <section id="how-it-works">
    <h2 className="section-title">How LocalLoop builds momentum</h2>
    <div className="grid three">
      <div className="feature-card">
        <h3>Start your Loop</h3>
        <p>Invite your neighbors or join an existing Loop for quick onboarding and instant access to trusted content.</p>
      </div>
      <div className="feature-card">
        <h3>Share and collaborate</h3>
        <p>Post alerts, schedule meetups, and co-create projects with built-in planning flows and collaborative notes.</p>
      </div>
      <div className="feature-card">
        <h3>Celebrate progress</h3>
        <p>Track neighborhood wins, highlight local talent, and surface impact metrics to keep everyone inspired.</p>
      </div>
    </div>
  </section>
);

const Testimonials = () => (
  <section id="community">
    <h2 className="section-title">Trusted by neighborhood organizers</h2>
    <div className="grid">
      {testimonials.map(item => (
        <blockquote key={item.name} className="testimonial-card">
          <p>“{item.quote}”</p>
          <cite>
            {item.name} · {item.role}
          </cite>
        </blockquote>
      ))}
    </div>
  </section>
);

const CallToAction = () => (
  <section id="cta">
    <article className="cta-card">
      <h2 className="section-title">Spark your LocalLoop</h2>
      <p className="section-subtitle">
        We are partnering with early adopters to co-create the most inclusive neighborhood platform on the market.
        Reserve your Loop and help shape what we build next.
      </p>
      <div className="hero-cta" style={{ justifyContent: 'center' }}>
        <a className="button primary" href="mailto:hello@localloop.app">
          Partner with us
        </a>
        <a className="button link" href="./policy.html">
          View policies
        </a>
      </div>
    </article>
  </section>
);

const AppFooter = () => (
  <footer className="footer">
    <div className="footer-inner">
      <div className="nav-logo">
        <img src="./logo.svg" alt="LocalLoop logo" width="32" height="32" />
        <span>LocalLoop</span>
      </div>
      <div className="footer-links">
        <a href="./policy.html">Privacy &amp; Use Policy</a>
        <a href="#features">Product</a>
        <a href="#community">Community</a>
        <a href="mailto:hello@localloop.app">Contact</a>
      </div>
      <span>© {new Date().getFullYear()} LocalLoop. All rights reserved.</span>
    </div>
  </footer>
);

const App = () => (
  <>
    <header>
      <nav className="nav">
        <a className="nav-logo" href="./">
          <img src="./logo.svg" alt="LocalLoop logo" width="32" height="32" />
          <span>LocalLoop</span>
        </a>
        <div className="nav-actions">
          <a href="#features">Features</a>
          <a href="#community">Community</a>
          <a className="button primary" href="mailto:hello@localloop.app">
            Request access
          </a>
        </div>
      </nav>
    </header>
    <main>
      <Hero />
      <Features />
      <HowItWorks />
      <Testimonials />
      <CallToAction />
    </main>
    <AppFooter />
  </>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
