const sections = [
  {
    id: 'privacy',
    title: 'Privacy Policy',
    paragraphs: [
      'LocalLoop is designed to keep neighborhood coordination simple, safe, and transparent. We collect only the information that helps us connect neighbors and deliver relevant updates.',
      'When you create an account we store your name, email, encrypted password, and neighborhood selection. Optional profile fields (like interests or expertise) are always opt-in and can be deleted from settings at any time.',
      'We never sell personal data. Limited information may be shared with trusted infrastructure partners strictly for delivering the LocalLoop service (authentication, push notifications, analytics).'
    ],
    listTitle: 'We use your data to:',
    listItems: [
      'Authenticate your account and keep loops secure',
      'Send relevant neighborhood alerts and event reminders',
      'Improve product features by analyzing anonymized usage patterns'
    ]
  },
  {
    id: 'data',
    title: 'Data Retention & Control',
    paragraphs: [
      'Data that you create in LocalLoop (posts, events, recommendations) belongs to you and your community. You can edit or delete your content at any time from within the app.',
      'If you close your account we delete profile data immediately and remove contributed content within 30 days, unless a neighborhood admin requests preservation for an active safety investigation.',
      'Request a portable export of your data at hello@localloop.app and we will provide a machine-readable archive within 14 days.'
    ]
  },
  {
    id: 'safety',
    title: 'Community Guidelines',
    paragraphs: [
      'LocalLoop exists to nurture trust and safety. We expect every member to interact respectfully, keep shared spaces inclusive, and follow local laws.',
      'Content that harasses, discriminates, promotes violence, or spreads misinformation is prohibited. Report concerns from inside the app or by emailing safety@localloop.app so our moderation team can respond quickly.',
      'Verified neighborhood captains can set additional rules that match community standards, provided they respect the core LocalLoop guidelines.'
    ]
  },
  {
    id: 'contact',
    title: 'Contact & Updates',
    paragraphs: [
      'Questions about this policy or your data rights? Reach us at privacy@localloop.app.',
      'We will notify all active members before we make material changes to these policies. Archived versions remain accessible for transparency.'
    ]
  }
];

const PolicyPage = () => (
  <>
    <header>
      <nav className="nav">
        <a className="nav-logo" href="./">
          <img src="./logo.svg" alt="LocalLoop logo" width="32" height="32" />
          <span>LocalLoop</span>
        </a>
        <div className="nav-actions">
          <a href="./">Home</a>
          <a className="button primary" href="mailto:privacy@localloop.app">
            Contact privacy
          </a>
        </div>
      </nav>
    </header>
    <main>
      <section className="hero" style={{ marginBottom: 40 }}>
        <div className="hero-text">
          <span className="pill">LocalLoop Policies</span>
          <h1>Privacy, trust, and safety at the core of every Loop.</h1>
          <p>
            This page outlines how LocalLoop protects your data, supports responsible community use, and keeps our
            neighbors informed about updates.
          </p>
        </div>
      </section>
      <section className="grid">
        {sections.map(section => (
          <article key={section.id} id={section.id} className="feature-card">
            <h2>{section.title}</h2>
            {section.paragraphs.map(text => (
              <p key={text}>{text}</p>
            ))}
            {section.listItems && (
              <>
                <h3>{section.listTitle}</h3>
                <ul>
                  {section.listItems.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            )}
          </article>
        ))}
      </section>
    </main>
    <footer className="footer">
      <div className="footer-inner">
        <span>© {new Date().getFullYear()} LocalLoop</span>
        <div className="footer-links">
          <a href="./">Product site</a>
          <a href="mailto:safety@localloop.app">Report concern</a>
          <a href="mailto:hello@localloop.app">General inquiries</a>
        </div>
      </div>
    </footer>
  </>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<PolicyPage />);
