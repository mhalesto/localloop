const highlightChips = [
  'Instant safety alerts',
  'Neighborhood marketplace',
  'Shared events calendar',
  'Civic dashboards',
  'iOS, Android & Web',
  'Offline-ready sync'
];

const stats = [
  { value: '1.2k', label: 'Loops active' },
  { value: '87%', label: 'Weekly engagement' },
  { value: '5x', label: 'Faster response' }
];

const features = [
  {
    title: 'Signal the moments that matter',
    description: 'Broadcast real-time safety updates, lost-and-found alerts, and civic notifications with precise geo targeting.',
    icon: '📡',
    bullets: [
      'Tiered urgency levels and verified alerts',
      'Auto-translate for multilingual neighborhoods',
      'Escalation routing to community captains'
    ]
  },
  {
    title: 'Activate trusted local commerce',
    description: 'Promote neighbors, pros, and pop-ups with traceable recommendations and secure ordering flows.',
    icon: '🛍️',
    bullets: [
      'Marketplace storefronts and tipping',
      'Reputation graph built on in-app feedback',
      'Paywall-free messaging with masked details'
    ]
  },
  {
    title: 'Plan gatherings with confidence',
    description: 'Build block parties, mutual aid drives, and micro events with collaborative checklists.',
    icon: '🎉',
    bullets: [
      'Smart RSVPs with headcount predictions',
      'Volunteer role management and reminders',
      'Shared galleries to capture community wins'
    ]
  },
  {
    title: 'Measure collective impact',
    description: 'Track neighborhood goals with dashboards your city hall can trust.',
    icon: '📊',
    bullets: [
      'Impact analytics for civic grants',
      'Heatmaps for requests and resources',
      'Exportable reports for stakeholders'
    ]
  }
];

const experience = [
  {
    title: 'Loop Feed',
    description: 'Stay synced on everything from urgent alerts to positive shout-outs with adaptive ranking and context cards.',
    image: './screens/feed.svg'
  },
  {
    title: 'Marketplace',
    description: 'Discover hyperlocal services, recommended pros, and community pop-ups with transparent neighbor reviews.',
    image: './screens/market.svg'
  },
  {
    title: 'Events & Projects',
    description: 'Spin up micro events, mutual aid drives, and civic projects with workflows built for community organizers.',
    image: './screens/events.svg'
  }
];

const testimonials = [
  {
    quote:
      'LocalLoop is the heartbeat for our neighborhood. Alerts are fast, and the marketplace has become our go-to for trusted services.',
    name: 'Elena Chen',
    role: 'Neighborhood Captain, Greenview East'
  },
  {
    quote:
      'We coordinate block parties, safety walks, and resource drives entirely inside LocalLoop. Residents show up informed and ready.',
    name: 'Marcus Reed',
    role: 'Community Organizer, Uptown Loop'
  },
  {
    quote:
      'Moving from three different apps to LocalLoop simplified our engagement strategy. Analytics made our city grant renewal seamless.',
    name: 'Priya Desai',
    role: 'Program Lead, Civic Impact Lab'
  }
];

const pricingTiers = [
  {
    name: 'Neighbors (Free)',
    price: '$0',
    cadence: '/forever',
    description: 'Perfect for resident groups getting started with their first Loop.',
    features: [
      'Up to 150 members per Loop',
      'Instant alerts and block chat',
      'Events with RSVP basics',
      'Local marketplace browsing',
      '5 marketplace posts per month'
    ],
    cta: 'Start your free loop'
  },
  {
    name: 'Neighborhood Plus',
    price: '$9',
    cadence: '/month per Loop',
    description: 'Unlock commerce tools and moderation superpowers for active communities.',
    features: [
      'Unlimited members & private circles',
      'Advanced alerts with auto-translate',
      'Smart event planning and volunteer roles',
      'Marketplace storefronts & payouts',
      'Moderator insights & safety reviews'
    ],
    cta: 'Upgrade to Plus',
    recommended: true
  },
  {
    name: 'Civic Pro',
    price: '$29',
    cadence: '/month per district',
    description: 'Ideal for city partners, business districts, and housing authorities.',
    features: [
      'Multi-loop management dashboard',
      'Unlimited analytics exports',
      'API access for city data teams',
      'Grant-ready impact reporting',
      'Priority onboarding & training'
    ],
    cta: 'Talk with partnerships'
  }
];

const Hero = () => (
  <section className="hero">
    <div className="hero-content">
      <div className="hero-headline">
        <span className="pill">Introducing LocalLoop</span>
        <h1>Real-time neighborhood intelligence, wrapped in trust.</h1>
        <p>
          LocalLoop unites neighbors, organizers, and civic partners with a single hub for safety alerts, local commerce,
          and community action. Give your block the modern operating system it deserves.
        </p>
      </div>
      <div className="hero-meta">
        <div className="hero-cta">
          <a className="button primary" href="https://expo.dev" target="_blank" rel="noreferrer">
            Join the beta
          </a>
          <a className="button secondary" href="#pricing">
            Compare plans
          </a>
        </div>
        <div className="stats">
          {stats.map(item => (
            <div key={item.label} className="stat">
              <span className="stat-value">{item.value}</span>
              <span className="stat-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    <div className="hero-media">
      <div className="lottie-wrapper">
        <lottie-player
          src="https://assets5.lottiefiles.com/packages/lf20_0fhlytwe.json"
          background="transparent"
          speed="1"
          loop
          autoplay
        ></lottie-player>
      </div>
      <div className="hero-frame">
        <img src="./mockup.svg" alt="LocalLoop mobile app mockup" />
        <div className="chip-row">
          {highlightChips.map(label => (
            <span key={label} className="chip">
              {label}
            </span>
          ))}
        </div>
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
    <div className="section-header">
      <span className="pill">Loop Core</span>
      <h2>One platform, every neighborhood workflow.</h2>
      <p>
        LocalLoop is built for community-first teams that need clear communications, inclusive commerce, and transparent
        collaboration without juggling a stack of tools.
      </p>
    </div>
    <div className="feature-grid">
      {features.map(feature => (
        <FeatureCard key={feature.title} feature={feature} />
      ))}
    </div>
  </section>
);

const Experience = () => (
  <section id="experience">
    <div className="section-header">
      <span className="pill">Product tour</span>
      <h2>See LocalLoop in action.</h2>
      <p>
        Screens built with neighborhood organizers, block captains, and civic partners to keep everyone connected and
        empowered.
      </p>
    </div>
    <div className="experience-grid">
      {experience.map(card => (
        <article key={card.title} className="experience-card">
          <img src={card.image} alt={`${card.title} screenshot`} />
          <div>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </div>
        </article>
      ))}
    </div>
  </section>
);

const Testimonials = () => (
  <section id="community">
    <div className="section-header">
      <span className="pill">Community proof</span>
      <h2>Neighborhood momentum starts here.</h2>
      <p>Local leaders across North America run their initiatives inside LocalLoop and never look back.</p>
    </div>
    <div className="testimonial-grid">
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

const PricingTier = ({ tier }) => (
  <article className={`tier-card${tier.recommended ? ' recommended' : ''}`}>
    <div className="tier-label">{tier.name}</div>
    <div className="tier-price">
      <strong>{tier.price}</strong>
      <span>{tier.cadence}</span>
    </div>
    <p>{tier.description}</p>
    <ul>
      {tier.features.map(feature => (
        <li key={feature}>{feature}</li>
      ))}
    </ul>
    <a
      className={`button ${tier.recommended ? 'primary' : 'secondary'}`}
      href={tier.recommended ? 'mailto:partnerships@localloop.app' : 'https://expo.dev'}
      target={tier.recommended ? '_self' : '_blank'}
      rel={tier.recommended ? undefined : 'noreferrer'}
    >
      {tier.cta}
    </a>
  </article>
);

const Pricing = () => (
  <section id="pricing">
    <div className="section-header">
      <span className="pill">Pricing</span>
      <h2>Flexible tiers for every stage of neighborhood growth.</h2>
      <p>
        Start free, then layer on commerce tools, analytics, and civic integrations as your Loop expands. Cancel any
        time.
      </p>
    </div>
    <div className="pricing-grid">
      {pricingTiers.map(tier => (
        <PricingTier key={tier.name} tier={tier} />
      ))}
    </div>
  </section>
);

const CallToAction = () => (
  <section id="cta">
    <article className="cta-card">
      <lottie-player
        className="cta-lottie"
        src="https://assets3.lottiefiles.com/packages/lf20_touohxv0.json"
        background="transparent"
        speed="1"
        loop
        autoplay
      ></lottie-player>
      <h2>Your block is ready for LocalLoop.</h2>
      <p>
        We partner with resident leaders, neighborhood associations, and civic innovators to co-create the future of
        inclusive communities. Claim your Loop and we will guide you from onboarding to first wins.
      </p>
      <div className="hero-cta" style={{ justifyContent: 'center' }}>
        <a className="button primary" href="mailto:hello@localloop.app">
          Partner with us
        </a>
        <a className="button secondary" href="./policy.html">
          Review policies
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
        <a href="#pricing">Pricing</a>
        <a href="./contact.html">Contact</a>
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
          <a href="#experience">Product tour</a>
          <a href="#pricing">Pricing</a>
          <a className="button primary" href="./contact.html">
            Contact us
          </a>
        </div>
      </nav>
    </header>
    <main>
      <Hero />
      <Features />
      <Experience />
      <Testimonials />
      <Pricing />
      <CallToAction />
    </main>
    <AppFooter />
  </>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
