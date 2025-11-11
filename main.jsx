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
    name: 'Basic',
    price: 'R0',
    cadence: '/month',
    description: 'Essential features for casual neighbors getting started.',
    features: [
      '5 posts per day',
      '5 statuses per day',
      '2 events per month',
      'Unlimited comments & replies',
      '5 basic accent themes',
      '5 AI cartoon avatars (lifetime)',
      'Free AI features',
      'Standard email support (48h)'
    ],
    cta: 'Get started'
  },
  {
    name: 'Go',
    price: 'R79.99',
    cadence: '/month',
    secondaryPrice: 'R799/year',
    secondaryLabel: 'save 17%',
    description: 'Perfect for active community members who want full creative control.',
    features: [
      'Unlimited posts & statuses',
      '5 events per month',
      '15+ premium gradient themes',
      'Custom typography controls',
      '10 AI cartoon avatars / month',
      '8 cartoon styles (Pixar, Anime, etc.)',
      'AI thread summaries & smart suggestions',
      'Translation in 11 languages',
      'Go Star badge ⭐ & ad-free experience',
      'Priority email support (24h)'
    ],
    cta: 'Subscribe now'
  },
  {
    name: 'Premium',
    price: 'R149.99',
    cadence: '/month',
    secondaryPrice: 'R1499/year',
    secondaryLabel: 'save 17%',
    description: 'GPT-4o powered AI features + premium experience. Same AI as ChatGPT Plus for less!',
    features: [
      'Everything in Go',
      '15 events per month',
      '✨ GPT-4o AI Post Composer',
      '🎨 Vision-Personalized Cartoons',
      '📝 GPT-4o Thread Summaries (4 styles)',
      '💬 Smart Comment Suggestions',
      '🌍 Cultural Translation (11 SA languages)',
      '20 Vision-enhanced HD cartoon avatars/month',
      'Custom cartoon prompts',
      'Premium Crown badge 👑',
      '5 exclusive Premium themes',
      'Advanced color controls',
      'Profile analytics dashboard',
      'Early access to new features'
    ],
    cta: 'Try Premium',
    recommended: false
  },
  {
    name: 'Gold',
    price: 'R249.99',
    cadence: '/month',
    secondaryPrice: 'R2499/year',
    secondaryLabel: 'save 17%',
    description: 'Ultimate power user experience with 3x AI limits for serious community leaders.',
    features: [
      'Everything in Premium',
      'Unlimited events',
      '🚀 3x All AI Limits',
      '⚡ 60 Vision Cartoons/month (vs 20)',
      '🎯 150 GPT-4o Summaries/day (vs 50)',
      '✍️ 90 Post Improvements/day (vs 30)',
      '📊 Advanced Analytics Dashboard',
      '💎 Exclusive Gold Crown Badge',
      '🎨 Unlimited Custom Themes',
      '100 avatar choices',
      '90-day market listing duration',
      'Priority marketplace positioning',
      'Early beta feature access',
      'Priority email support (faster response)'
    ],
    cta: 'Get Gold',
    recommended: true
  }
];

const addOns = [
  {
    title: 'AI avatar boost packs',
    price: 'R19',
    description: 'Top up with 20 additional avatars whenever inspiration strikes. Stacks with Premium or Gold quotas.',
    icon: '✨'
  },
  {
    title: 'Community bundles',
    price: 'from R249',
    description: 'Bundle 5 Premium seats + shared Gold analytics for HOAs, BIDs, or clubs. Includes onboarding support.',
    icon: '🤝'
  },
  {
    title: 'Launch promos',
    price: 'R29.99 intro',
    description: 'Offer a three-month Premium promo rate before rolling to R49.99. Perfect for new Loops ramping up.',
    icon: '🎁'
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
    {tier.secondaryPrice ? (
      <div className="tier-price-secondary">
        <span>{tier.secondaryPrice}</span>
        {tier.secondaryLabel ? <span className="tier-price-badge">{tier.secondaryLabel}</span> : null}
      </div>
    ) : null}
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

const AddOns = () => (
  <section id="addons">
    <div className="section-header">
      <span className="pill">Add-ons & bundles</span>
      <h2>Mix in extras when your Loop needs a boost.</h2>
      <p>Top up AI credits, bundle seats for HOAs, or launch with a limited-time promo—no commitment required.</p>
    </div>
    <div className="addon-grid">
      {addOns.map(addon => (
        <article key={addon.title} className="addon-card">
          <span className="feature-icon" role="img" aria-hidden="true">
            {addon.icon}
          </span>
          <div className="addon-price-row">
            <strong>{addon.price}</strong>
            <span>{addon.title}</span>
          </div>
          <p>{addon.description}</p>
        </article>
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
      <AddOns />
      <CallToAction />
    </main>
    <AppFooter />
  </>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
