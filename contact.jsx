const tierDetails = [
  {
    name: 'Neighbors (Free)',
    price: '$0',
    cadence: '/forever',
    summary: 'Launch your first Loop with enough power to keep neighbors connected and safe.',
    features: [
      {
        title: 'Core communications',
        items: ['Unlimited posts and comments', 'Priority & FYI alert types', 'Push + email notifications']
      },
      {
        title: 'Events & coordination',
        items: ['Up to 3 concurrent events', 'RSVP tracking with reminders', 'Shared notes & resource links']
      },
      {
        title: 'Marketplace basics',
        items: ['Browse local listings', 'Post up to 5 offers per month', 'Collect recommendations from neighbors']
      }
    ]
  },
  {
    name: 'Neighborhood Plus',
    price: '$9',
    cadence: '/month per Loop',
    summary: 'Ideal for active blocks ready to monetize and moderate at scale.',
    features: [
      {
        title: 'Enhanced communications',
        items: ['Unlimited alert escalation tiers', 'Automatic language translation', 'Invite-only circles & channels']
      },
      {
        title: 'Growth & monetization',
        items: [
          'Unlimited marketplace listings',
          'Payment & payout integrations',
          'Featured local business highlights'
        ]
      },
      {
        title: 'Safety & insights',
        items: ['Moderator workflow with escalation inbox', 'Analytics dashboard with week-over-week trends', 'Audit logs for neighborhood admins']
      }
    ]
  },
  {
    name: 'Civic Pro',
    price: '$29',
    cadence: '/month per district',
    summary: 'Built with municipalities, BID teams, and housing authorities to unify multiple Loops.',
    features: [
      {
        title: 'Multi-loop oversight',
        items: ['Central command dashboard', 'District-wide announcements', 'Granular roles & permissions']
      },
      {
        title: 'Data & integrations',
        items: [
          'Open API access & webhooks',
          'Scheduled CSV / JSON exports',
          'GIS-ready heatmaps for requests and resources'
        ]
      },
      {
        title: 'Support & enablement',
        items: ['Dedicated partner manager', 'Custom onboarding workshops', 'SLA-backed support with 4h response']
      }
    ]
  }
];

const contactChannels = [
  {
    label: 'General inquiries',
    value: 'hello@localloop.app'
  },
  {
    label: 'Partnerships & Civic Pro',
    value: 'partnerships@localloop.app'
  },
  {
    label: 'Privacy & compliance',
    value: 'privacy@localloop.app'
  }
];

const Header = () => (
  <header>
    <nav className="nav">
      <a className="nav-logo" href="./">
        <img src="./logo.svg" alt="LocalLoop logo" width="32" height="32" />
        <span>LocalLoop</span>
      </a>
      <div className="nav-actions">
        <a href="./#features">Features</a>
        <a href="./#pricing">Pricing</a>
        <a href="./policy.html">Policies</a>
        <a className="button primary" href="mailto:hello@localloop.app">
          Email us
        </a>
      </div>
    </nav>
  </header>
);

const resolveApiBaseUrl = () => {
  const candidates = [
    typeof window !== 'undefined' ? window.LOCALLOOP_API_BASE_URL : null,
    typeof window !== 'undefined' && window.LOCALLOOP_SITE_CONFIG ? window.LOCALLOOP_SITE_CONFIG.apiBaseUrl : null
  ].filter(Boolean);
  const picked = candidates.length ? candidates[0] : '';
  return picked ? picked.replace(/\/+$/, '') : '';
};

const ContactHero = () => (
  <section className="hero">
    <div className="hero-content">
      <div className="hero-headline">
        <span className="pill">Contact LocalLoop</span>
        <h1>Let’s activate your neighborhood momentum.</h1>
        <p>
          Tell us about your Loop, the stakeholders you support, and the outcomes you need. We will pair you with the
          right tier and onboarding plan.
        </p>
      </div>
      <div className="hero-meta">
        <div className="hero-cta">
          <a className="button primary" href="mailto:partnerships@localloop.app">
            Talk with a specialist
          </a>
          <a className="button secondary" href="./#pricing">
            View pricing overview
          </a>
        </div>
      </div>
    </div>
    <div className="hero-media">
      <div className="lottie-wrapper">
        <lottie-player
          src="https://assets8.lottiefiles.com/packages/lf20_3ktmthun.json"
          background="transparent"
          speed="1"
          loop
          autoplay
        ></lottie-player>
      </div>
      <div className="hero-frame">
        <img src="./mockup.svg" alt="LocalLoop app preview" />
        <div className="chip-row">
          <span className="chip">Resident onboarding</span>
          <span className="chip">Partnership kits</span>
          <span className="chip">24/7 monitoring</span>
        </div>
      </div>
    </div>
  </section>
);

const TierDetailCard = ({ tier }) => (
  <article className="tier-card">
    <div className="tier-label">{tier.name}</div>
    <div className="tier-price">
      <strong>{tier.price}</strong>
      <span>{tier.cadence}</span>
    </div>
    <p>{tier.summary}</p>
    {tier.features.map(section => (
      <div key={section.title} className="feature-card" style={{ background: 'transparent', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.04)' }}>
        <h3>{section.title}</h3>
        <ul>
          {section.items.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    ))}
    <a className="button primary" href="mailto:partnerships@localloop.app">
      Schedule a walkthrough
    </a>
  </article>
);

const TierBreakdown = () => (
  <section>
    <div className="section-header">
      <span className="pill">Tier deep dive</span>
      <h2>Every feature included, from free to civic scale.</h2>
      <p>
        Explore the capabilities bundled with each LocalLoop tier so you can choose the right path for your community.
        Free plans never expire, and you can upgrade or downgrade at any time.
      </p>
    </div>
    <div className="pricing-grid">
      {tierDetails.map(tier => (
        <TierDetailCard key={tier.name} tier={tier} />
      ))}
    </div>
  </section>
);

const ContactPanel = () => {
  const apiBaseUrl = React.useMemo(() => resolveApiBaseUrl(), []);
  const [form, setForm] = React.useState({
    name: '',
    email: '',
    role: 'Resident leader',
    tier: tierDetails[0]?.name ?? 'Neighbors (Free)',
    notes: ''
  });
  const [status, setStatus] = React.useState({ state: 'idle', message: '' });

  const updateField = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const endpoint = React.useMemo(() => {
    if (!apiBaseUrl) return '/contact/messages';
    return `${apiBaseUrl}/contact/messages`;
  }, [apiBaseUrl]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ state: 'pending', message: '' });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.error || 'We could not send your message. Please try again.';
        setStatus({ state: 'error', message });
        return;
      }

      setStatus({ state: 'success', message: 'Thanks! Our neighborhood success team will reach out shortly.' });
      setForm({
        name: '',
        email: '',
        role: 'Resident leader',
        tier: tierDetails[0]?.name ?? 'Neighbors (Free)',
        notes: ''
      });
    } catch (error) {
      setStatus({
        state: 'error',
        message:
          'We hit a network snag while submitting your message. Double-check your connection or email us directly.'
      });
    }
  };

  return (
    <section>
      <div className="section-header">
        <span className="pill">Connect</span>
        <h2>We respond within one business day.</h2>
        <p>
          Share a few details and our neighborhood success team will tailor a launch plan, data migration support, and
          pricing estimate that fits your goals.
        </p>
        {!apiBaseUrl && (
          <p style={{ color: 'rgba(255, 204, 128, 0.85)', fontSize: 14 }}>
            Hosting the marketing site separately? Expose your backend at the same origin or set{' '}
            <code>window.LOCALLOOP_API_BASE_URL</code> before loading this page.
          </p>
        )}
      </div>
      <div className="contact-grid">
        <article className="contact-card">
          <form onSubmit={handleSubmit}>
            <label>
              Name
              <input type="text" name="name" placeholder="Jordan Lee" value={form.name} onChange={updateField('name')} required />
            </label>
            <label>
              Email
              <input
                type="email"
                name="email"
                placeholder="you@organization.org"
                value={form.email}
                onChange={updateField('email')}
                required
              />
            </label>
            <label>
              Role
              <select name="role" value={form.role} onChange={updateField('role')}>
                <option value="Resident leader">Resident leader</option>
                <option value="Neighborhood association">Neighborhood association</option>
                <option value="Civic / municipal partner">Civic / municipal partner</option>
                <option value="Business district">Business district</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>
              Which tier are you exploring?
              <select name="tier" value={form.tier} onChange={updateField('tier')}>
                {tierDetails.map((tier) => (
                  <option key={tier.name} value={tier.name}>
                    {tier.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tell us about your goals
              <textarea
                name="notes"
                placeholder="Share member counts, goals, or timelines so we can tailor our response."
                value={form.notes}
                onChange={updateField('notes')}
              />
            </label>
            <button type="submit" className="button primary" disabled={status.state === 'pending'}>
              {status.state === 'pending' ? 'Sending…' : 'Send message'}
            </button>
            {status.state !== 'idle' && (
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: status.state === 'success' ? 'rgba(126, 255, 207, 0.9)' : 'rgba(255, 184, 184, 0.9)'
                }}
              >
                {status.message}
              </p>
            )}
          </form>
        </article>
        <aside className="contact-insight">
          <h3>Direct channels</h3>
          <ul>
            {contactChannels.map((channel) => (
              <li key={channel.value}>
                <strong>{channel.label}:</strong> <a href={`mailto:${channel.value}`}>{channel.value}</a>
              </li>
            ))}
          </ul>
          <h3>What happens next</h3>
          <ul>
            <li>We book a discovery session to understand your neighborhood dynamics.</li>
            <li>Our team shares a tailored rollout plan with success metrics.</li>
            <li>You receive launch collateral and onboarding materials for members.</li>
          </ul>
        </aside>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="footer">
    <div className="footer-inner">
      <div className="nav-logo">
        <img src="./logo.svg" alt="LocalLoop logo" width="32" height="32" />
        <span>LocalLoop</span>
      </div>
      <div className="footer-links">
        <a href="./">Home</a>
        <a href="./policy.html">Policies</a>
        <a href="mailto:hello@localloop.app">Email</a>
      </div>
      <span>© {new Date().getFullYear()} LocalLoop. All rights reserved.</span>
    </div>
  </footer>
);

const App = () => (
  <>
    <Header />
    <main>
      <ContactHero />
      <TierBreakdown />
      <ContactPanel />
    </main>
    <Footer />
  </>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
